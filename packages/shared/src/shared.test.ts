import { describe, expect, it } from "vitest";
import {
  BackupSchema,
  distanceAndBearing,
  formatFrequency,
  isBroadcastActive,
  parseDays,
  parseUtcTime,
  recommendBands,
  scoreBroadcast,
} from ".";

describe("horários EiBi", () => {
  it("interpreta frequência horária e dias", () => {
    expect(parseUtcTime("2330")).toBe(1410);
    expect(parseDays("Mo-Fr")).toEqual([1, 2, 3, 4, 5]);
  });
  it("trata virada da meia-noite no dia anterior", () => {
    const b = { startUtcMinutes: 1380, endUtcMinutes: 60, days: [1] };
    expect(isBroadcastActive(b, new Date("2026-07-14T00:30:00Z"))).toBe(true);
    expect(isBroadcastActive(b, new Date("2026-07-14T02:00:00Z"))).toBe(false);
  });
});
describe("geografia e ranking", () => {
  it("calcula distância sem localização obrigatória", () => {
    expect(
      distanceAndBearing(
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 1 },
      ).distanceKm,
    ).toBe(111);
  });
  it("prioriza frequência exata", () => {
    const base = {
      id: "1",
      season: "A26",
      frequencyKHz: 11780,
      startUtcMinutes: 0,
      endUtcMinutes: 1440,
      days: [0, 1, 2, 3, 4, 5, 6],
      dayExpressionOriginal: "",
      stationName: "Teste",
      countryCode: "B",
      languageCode: "P",
      targetCode: "SAm",
      transmitterCode: "",
      source: "fixture",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    const input = {
      frequencyKHz: 11780,
      dateTimeUtc: "2026-07-13T12:00:00.000Z",
      toleranceKHz: 5,
      mode: "AM" as const,
      limit: 30,
      offset: 0,
    };
    expect(scoreBroadcast(base, input).score).toBeGreaterThan(
      scoreBroadcast({ ...base, frequencyKHz: 11784 }, input).score,
    );
  });
});
describe("backup", () => {
  it("rejeita versão desconhecida", () =>
    expect(() =>
      BackupSchema.parse({
        format: "pl330-companion-backup",
        version: 9,
        exportedAt: new Date().toISOString(),
        entries: [],
      }),
    ).toThrow());
});
describe("frequência e propagação", () => {
  it("formata FM em MHz", () =>
    expect(formatFrequency(106100)).toBe("106,1 MHz"));
  it("produz notas diferenciadas conforme a banda", () => {
    const result = recommendBands({
      isNight: true,
      solarElevationDeg: -18,
      kp: 2,
      kpTrend: -0.6,
      f107: 125,
      alerts: 0,
    });
    expect(new Set(result.map((band) => band.score)).size).toBeGreaterThan(5);
    expect(result[0].score).toBeGreaterThan(result.at(-1)!.score);
  });
  it("muda a ordem entre dia e noite", () => {
    const night = recommendBands({
      isNight: true,
      solarElevationDeg: -20,
      kp: 2,
      f107: 145,
      alerts: 0,
    });
    const day = recommendBands({
      isNight: false,
      solarElevationDeg: 35,
      kp: 2,
      f107: 145,
      alerts: 0,
    });
    expect(night[0].name).not.toBe(day[0].name);
  });
});
