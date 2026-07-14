import Dexie, { type EntityTable } from "dexie";
import {
  BackupSchema,
  LocalStationSchema,
  LogEntrySchema,
  type Backup,
  type LocalStation,
  type LogEntry,
} from "@pl330/shared";

export type Preference = { key: string; value: unknown };
export type RecentSearch = {
  id: string;
  createdAt: string;
  frequencyKHz: number;
  payload: unknown;
};
export class PL330Database extends Dexie {
  logs!: EntityTable<LogEntry, "id">;
  preferences!: EntityTable<Preference, "key">;
  recentSearches!: EntityTable<RecentSearch, "id">;
  localStations!: EntityTable<LocalStation, "id">;
  constructor() {
    super("pl330-companion");
    this.version(1).stores({
      logs: "id, listenedAtUtc, frequencyKHz, mode, stationName, country, language, favorite, *tags",
      preferences: "key",
      recentSearches: "id, createdAt, frequencyKHz",
    });
    this.version(2)
      .stores({
        logs: "id, listenedAtUtc, frequencyKHz, mode, stationName, country, language, favorite, *tags",
        preferences: "key",
        recentSearches: "id, createdAt, frequencyKHz",
        localStations: "id, frequencyKHz, name, city, state, builtIn",
      })
      .upgrade(async (tx) => {
        const now = new Date().toISOString();
        await tx.table("localStations").put({
          id: "5d79cc4d-d7e2-4b59-9ca4-cfc33e878b4a",
          name: "Rádio Coroado FM",
          frequencyKHz: 106100,
          mode: "FM",
          city: "Curitibanos",
          state: "SC",
          country: "Brasil",
          website: "https://portalcoroado.com.br/home/",
          source: "https://portalcoroado.com.br/home/institucional/",
          sourceLabel: "Portal Coroado (fonte oficial)",
          notes:
            "Emissora da Fundação Frei Rogério, migrada para 106,1 FM em 2017.",
          builtIn: true,
          createdAt: now,
          updatedAt: now,
        });
      });
  }
}
export const db = new PL330Database();
void db.localStations.put({
  id: "5d79cc4d-d7e2-4b59-9ca4-cfc33e878b4a",
  name: "Rádio Coroado FM",
  frequencyKHz: 106100,
  mode: "FM",
  city: "Curitibanos",
  state: "SC",
  country: "Brasil",
  website: "https://portalcoroado.com.br/home/",
  source: "https://portalcoroado.com.br/home/institucional/",
  sourceLabel: "Portal Coroado (fonte oficial)",
  notes: "Emissora da Fundação Frei Rogério, migrada para 106,1 FM em 2017.",
  builtIn: true,
  createdAt: "2026-07-14T00:00:00.000Z",
  updatedAt: "2026-07-14T00:00:00.000Z",
});

export async function exportBackup(): Promise<Backup> {
  return {
    format: "pl330-companion-backup",
    version: 3,
    exportedAt: new Date().toISOString(),
    entries: await db.logs.toArray(),
    preferences: Object.fromEntries(
      (await db.preferences.toArray()).map((p) => [p.key, p.value]),
    ),
    localStations: await db.localStations.toArray(),
  };
}
export async function importBackup(value: unknown) {
  const backup = BackupSchema.parse(value);
  const entries = backup.entries.map((entry) => LogEntrySchema.parse(entry));
  const stations = (backup.localStations ?? []).map((station) =>
    LocalStationSchema.parse(station),
  );
  await db.transaction(
    "rw",
    db.logs,
    db.preferences,
    db.localStations,
    async () => {
      await db.logs.bulkPut(entries);
      if (backup.preferences)
        await db.preferences.bulkPut(
          Object.entries(backup.preferences).map(([key, value]) => ({
            key,
            value,
          })),
        );
      if (stations.length) await db.localStations.bulkPut(stations);
    },
  );
  return entries.length;
}
export function toCsv(entries: LogEntry[]) {
  const columns: (keyof LogEntry)[] = [
    "listenedAtUtc",
    "localDateTime",
    "frequencyKHz",
    "mode",
    "stationName",
    "country",
    "language",
    "transmitter",
    "sinpo",
    "antenna",
    "receptionLocation",
    "content",
    "notes",
    "tags",
    "favorite",
  ];
  const escape = (v: unknown) =>
    `"${String(Array.isArray(v) ? v.join(", ") : (v ?? "")).replaceAll('"', '""')}"`;
  return [
    columns.join(","),
    ...entries.map((e) => columns.map((c) => escape(e[c])).join(",")),
  ].join("\n");
}
export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
