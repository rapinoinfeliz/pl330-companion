import { parseDays, parseUtcTime, type Broadcast } from "@pl330/shared";

export type ParsedRow = Broadcast & { sourceRowHash: string; startDate?: string; stopDate?: string };
export type ParseResult = { rows: ParsedRow[]; invalid: { line: number; reason: string; raw: string }[]; duplicates: number };

const cleanHeader = (value: string) => value.replace(/^\uFEFF/, "").split(":")[0].trim().toLowerCase();
const digest = async (value: string) => {
  const data = new TextEncoder().encode(value); const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

export async function parseEibiCsv(csv: string, season: string, source: string): Promise<ParseResult> {
  const lines = csv.replace(/\r/g, "").split("\n").filter(Boolean);
  if (!lines.length) throw new Error("CSV EiBi vazio");
  const headers = lines[0].split(";").map(cleanHeader);
  const index = (name: string) => headers.indexOf(name);
  for (const required of ["khz", "time(utc)", "itu", "station"]) if (index(required) < 0) throw new Error(`Cabeçalho EiBi ausente: ${required}`);
  const rows: ParsedRow[] = []; const invalid: ParseResult["invalid"] = []; const seen = new Set<string>(); let duplicates = 0;
  for (let n = 1; n < lines.length; n++) {
    const raw = lines[n];
    try {
      const cells = raw.split(";"); const frequencyKHz = Number(cells[index("khz")]);
      if (!Number.isFinite(frequencyKHz) || frequencyKHz < 10 || frequencyKHz > 30000) throw new Error("frequência fora da faixa");
      const time = cells[index("time(utc)")]?.match(/^(\d{4})-(\d{4})$/); if (!time) throw new Error("horário inválido");
      const stationName = cells[index("station")]?.trim(); if (!stationName) throw new Error("emissora ausente");
      const dayExpressionOriginal = cells[index("days")]?.trim() ?? "";
      const key = `${season}|${frequencyKHz}|${time[1]}|${time[2]}|${dayExpressionOriginal}|${stationName}|${cells[index("itu")]}`;
      const sourceRowHash = await digest(key);
      if (seen.has(sourceRowHash)) { duplicates++; continue; } seen.add(sourceRowHash);
      rows.push({
        id: sourceRowHash, sourceRowHash, season, frequencyKHz, startUtcMinutes: parseUtcTime(time[1]), endUtcMinutes: parseUtcTime(time[2]),
        days: parseDays(dayExpressionOriginal), dayExpressionOriginal, stationName, countryCode: cells[index("itu")]?.trim() || "?",
        languageCode: cells[index("lng")]?.trim() || "?", targetCode: cells[index("target")]?.trim() || "?",
        transmitterCode: cells[index("p")]?.trim() || "", notes: cells[index("remarks")]?.trim() || undefined,
        source, updatedAt: new Date().toISOString(), startDate: cells[index("start")]?.trim() || undefined, stopDate: cells[index("stop")]?.trim() || undefined,
      });
    } catch (error) { invalid.push({ line: n + 1, reason: error instanceof Error ? error.message : "linha inválida", raw: raw.slice(0, 500) }); }
  }
  return { rows, invalid, duplicates };
}

export function detectSeason(page: string, now = new Date()): string {
  const match = page.match(/sked-([AB]\d{2})\.csv/i); if (match) return match[1].toUpperCase();
  return `${now.getUTCMonth() >= 2 && now.getUTCMonth() <= 9 ? "A" : "B"}${String(now.getUTCFullYear()).slice(-2)}`;
}
