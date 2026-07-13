import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { SearchSchema } from "@pl330/shared";
import { detectSeason, parseEibiCsv } from "./eibi";
import { NOAA_URLS, refreshNoaa } from "./noaa";

type Bindings = { DB: D1Database; ASSETS: Fetcher; ADMIN_SECRET: string; APP_ORIGIN?: string };
const app = new Hono<{ Bindings: Bindings }>();

app.use("*", async (c, next) => { c.set("requestId" as never, crypto.randomUUID() as never); await next(); c.header("X-Request-Id", c.get("requestId" as never) as string); });
app.use("*", secureHeaders({ contentSecurityPolicy: { defaultSrc: ["'self'"], connectSrc: ["'self'"], imgSrc: ["'self'", "data:"], styleSrc: ["'self'", "'unsafe-inline'"], scriptSrc: ["'self'"] } }));
app.use("/api/*", cors({ origin: (origin, c) => !origin || origin === c.env.APP_ORIGIN ? origin : c.env.APP_ORIGIN || "", allowMethods: ["GET", "POST", "OPTIONS"] }));

const fail = (c: any, status: number, code: string, message: string) => c.json({ error: { code, message, requestId: c.get("requestId") } }, status);
app.get("/api/health", (c) => c.json({ ok: true, service: "pl330-companion", at: new Date().toISOString() }));
app.get("/api/status", async (c) => c.json({ sources: (await c.env.DB.prepare("SELECT * FROM source_status ORDER BY source").all()).results }));

const baseSelect = `SELECT id, season, frequency_khz as frequencyKHz, start_utc_minutes as startUtcMinutes, end_utc_minutes as endUtcMinutes,
days_json as daysJson, day_expression_original as dayExpressionOriginal, station_name as stationName, country_code as countryCode,
language_code as languageCode, target_code as targetCode, transmitter_code as transmitterCode, transmitter_name as transmitterName,
latitude, longitude, notes, source, created_at as updatedAt FROM broadcasts`;

app.get("/api/schedules/search", async (c) => {
  const parsed = SearchSchema.safeParse(c.req.query()); if (!parsed.success) return fail(c, 400, "INVALID_SEARCH", "Os parâmetros da pesquisa são inválidos.");
  const q = parsed.data; const result = await c.env.DB.prepare(`${baseSelect} WHERE frequency_khz BETWEEN ? AND ? ORDER BY ABS(frequency_khz - ?) LIMIT ? OFFSET ?`)
    .bind(q.frequencyKHz - q.toleranceKHz, q.frequencyKHz + q.toleranceKHz, q.frequencyKHz, q.limit, q.offset).all();
  return c.json({ data: result.results.map(hydrate), metadata: { source: "EiBi", queryAt: new Date().toISOString(), limit: q.limit, offset: q.offset } }, 200, { "Cache-Control": "public, max-age=60, stale-while-revalidate=3600" });
});
app.get("/api/schedules/on-air", async (c) => {
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") || 50))); const minute = Number(c.req.query("minute") ?? new Date().getUTCHours() * 60 + new Date().getUTCMinutes());
  const result = await c.env.DB.prepare(`${baseSelect} WHERE (start_utc_minutes <= end_utc_minutes AND start_utc_minutes <= ? AND end_utc_minutes > ?) OR (start_utc_minutes > end_utc_minutes AND (start_utc_minutes <= ? OR end_utc_minutes > ?)) ORDER BY frequency_khz LIMIT ?`).bind(minute, minute, minute, minute, limit).all();
  return c.json({ data: result.results.map(hydrate), atUtcMinute: minute }, 200, { "Cache-Control": "public, max-age=60" });
});
app.get("/api/schedules/bands", async (c) => c.json({ data: (await c.env.DB.prepare("SELECT CAST(frequency_khz / 1000 AS INTEGER) AS mhz, COUNT(*) AS count FROM broadcasts GROUP BY mhz ORDER BY mhz").all()).results }));
app.get("/api/schedules/metadata", async (c) => c.json((await c.env.DB.prepare("SELECT * FROM schedule_imports WHERE status='success' ORDER BY imported_at DESC LIMIT 1").first()) || { status: "empty" }));

app.get("/api/space-weather/:kind", async (c) => {
  const map: Record<string, string[]> = { current: ["kpMinute", "f107Detail", "scales", "alerts"], kp: ["kp", "kpMinute", "kpForecast"], f107: ["f107", "f107Detail"], alerts: ["alerts"] };
  const sources = map[c.req.param("kind")]; if (!sources) return fail(c, 404, "NOT_FOUND", "Recurso não encontrado.");
  const placeholders = sources.map(() => "?").join(",");
  const rows = (await c.env.DB.prepare(`SELECT s.* FROM space_weather_snapshots s JOIN (SELECT source, MAX(id) id FROM space_weather_snapshots WHERE valid=1 AND source IN (${placeholders}) GROUP BY source) x ON x.id=s.id`).bind(...sources).all()).results;
  return c.json({ data: Object.fromEntries(rows.map((row: any) => [row.source, JSON.parse(row.payload_json)])), snapshots: rows.map(({ payload_json, ...rest }: any) => rest) }, 200, { "Cache-Control": "public, max-age=300, stale-if-error=86400" });
});

const authorized = (c: any) => c.req.header("Authorization") === `Bearer ${c.env.ADMIN_SECRET}`;
app.post("/api/admin/refresh-noaa", async (c) => authorized(c) ? c.json(await refreshNoaa(c.env.DB)) : fail(c, 401, "UNAUTHORIZED", "Acesso administrativo inválido."));
app.post("/api/admin/import-eibi", async (c) => {
  if (!authorized(c)) return fail(c, 401, "UNAUTHORIZED", "Acesso administrativo inválido.");
  const home = await fetch("https://www.eibispace.de/").then((r) => r.text()); const season = detectSeason(home); const source = `https://www.eibispace.de/dx/sked-${season.toLowerCase()}.csv`;
  const csv = await fetch(source).then((r) => { if (!r.ok) throw new Error(`EiBi HTTP ${r.status}`); return r.text(); }); if (csv.length > 25_000_000) return fail(c, 413, "IMPORT_TOO_LARGE", "O arquivo EiBi excede o limite.");
  const parsed = await parseEibiCsv(csv, season, source); const version = crypto.randomUUID();
  const statements = parsed.rows.map((b) => c.env.DB.prepare("INSERT INTO broadcasts_staging (version, id, season, frequency_khz, start_utc_minutes, end_utc_minutes, days_json, day_expression_original, station_name, country_code, language_code, target_code, transmitter_code, notes, source, source_row_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(version, b.id, b.season, b.frequencyKHz, b.startUtcMinutes, b.endUtcMinutes, JSON.stringify(b.days), b.dayExpressionOriginal, b.stationName, b.countryCode, b.languageCode, b.targetCode, b.transmitterCode, b.notes || null, b.source, b.sourceRowHash, b.updatedAt));
  for (let i = 0; i < statements.length; i += 50) await c.env.DB.batch(statements.slice(i, i + 50));
  await c.env.DB.batch([c.env.DB.prepare("DELETE FROM broadcasts"), c.env.DB.prepare("INSERT INTO broadcasts SELECT id, season, frequency_khz, start_utc_minutes, end_utc_minutes, days_json, day_expression_original, station_name, country_code, language_code, target_code, transmitter_code, NULL, NULL, NULL, notes, source, source_row_hash, created_at FROM broadcasts_staging WHERE version=?").bind(version), c.env.DB.prepare("DELETE FROM broadcasts_staging"), c.env.DB.prepare("INSERT INTO schedule_imports (id, season, source, source_hash, record_count, invalid_count, imported_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'success')").bind(version, season, source, version, parsed.rows.length, parsed.invalid.length, new Date().toISOString())]);
  return c.json({ season, imported: parsed.rows.length, invalid: parsed.invalid.length, duplicates: parsed.duplicates });
});

function hydrate(row: any) { return { ...row, days: JSON.parse(row.daysJson || "[]"), daysJson: undefined }; }
app.notFound(async (c) => c.env.ASSETS ? c.env.ASSETS.fetch(c.req.raw) : fail(c, 404, "NOT_FOUND", "Recurso não encontrado."));

export default { fetch: app.fetch, async scheduled(_event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) { ctx.waitUntil(refreshNoaa(env.DB)); } };
export { app };
