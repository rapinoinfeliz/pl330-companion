import { z } from "zod";

const time = z.string();
const KpProduct = z.array(z.object({ time_tag: time, Kp: z.coerce.number(), a_running: z.coerce.number().optional(), station_count: z.coerce.number().optional() }));
const KpMinute = z.array(z.object({ time_tag: time, kp_index: z.coerce.number(), estimated_kp: z.coerce.number(), kp: z.string() }));
const KpForecast = z.array(z.object({ time_tag: time, kp: z.coerce.number(), observed: z.string(), noaa_scale: z.string().nullable() }));
const Flux30 = z.array(z.object({ time_tag: time, flux: z.coerce.number() }));
const FluxDetail = z.array(z.object({ time_tag: time, frequency: z.coerce.number(), flux: z.coerce.number(), reporting_schedule: z.string() }));
const Alert = z.array(z.object({ product_id: z.string(), issue_datetime: z.string(), message: z.string() }));
const Scales = z.record(z.object({ DateStamp: z.string(), TimeStamp: z.string(), R: z.record(z.unknown()), S: z.record(z.unknown()), G: z.record(z.unknown()) }));

export const NOAA_URLS = {
  kp: "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
  kpMinute: "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json",
  kpForecast: "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json",
  f107: "https://services.swpc.noaa.gov/products/10cm-flux-30-day.json",
  f107Detail: "https://services.swpc.noaa.gov/json/f107_cm_flux.json",
  scales: "https://services.swpc.noaa.gov/products/noaa-scales.json",
  alerts: "https://services.swpc.noaa.gov/products/alerts.json",
} as const;

export function parseNoaa(kind: keyof typeof NOAA_URLS, data: unknown) {
  const parsers = { kp: KpProduct, kpMinute: KpMinute, kpForecast: KpForecast, f107: Flux30, f107Detail: FluxDetail, alerts: Alert, scales: Scales };
  return parsers[kind].parse(data);
}

export async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { const response = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "PL-330-Companion/0.1" } }); if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); }
  finally { clearTimeout(timer); }
}

export async function refreshNoaa(db: D1Database) {
  const collectedAt = new Date().toISOString(); const results: Record<string, unknown> = {}; const failures: string[] = [];
  for (const [kind, url] of Object.entries(NOAA_URLS) as [keyof typeof NOAA_URLS, string][]) {
    try {
      const parsed = parseNoaa(kind, await fetchJson(url)); results[kind] = parsed;
      await db.prepare("INSERT INTO space_weather_snapshots (source, observed_at, collected_at, payload_json, valid) VALUES (?, ?, ?, ?, 1)")
        .bind(kind, observedAt(kind, parsed), collectedAt, JSON.stringify(parsed)).run();
      await db.prepare("INSERT INTO source_status (source, status, checked_at, last_success_at, message) VALUES (?, 'updated', ?, ?, NULL) ON CONFLICT(source) DO UPDATE SET status='updated', checked_at=excluded.checked_at, last_success_at=excluded.last_success_at, message=NULL")
        .bind(`noaa:${kind}`, collectedAt, collectedAt).run();
    } catch (error) {
      failures.push(kind); await db.prepare("INSERT INTO source_status (source, status, checked_at, message) VALUES (?, 'last-known', ?, ?) ON CONFLICT(source) DO UPDATE SET status='last-known', checked_at=excluded.checked_at, message=excluded.message")
        .bind(`noaa:${kind}`, collectedAt, error instanceof Error ? error.message : "falha desconhecida").run();
    }
  }
  return { collectedAt, results, failures };
}

function observedAt(kind: string, payload: any): string {
  if (Array.isArray(payload) && payload.length) return payload[0]?.time_tag || payload[0]?.issue_datetime || new Date().toISOString();
  if (kind === "scales" && payload?.["0"]) return `${payload["0"].DateStamp}T${payload["0"].TimeStamp}Z`;
  return new Date().toISOString();
}
