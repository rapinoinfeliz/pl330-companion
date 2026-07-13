import Dexie, { type EntityTable } from "dexie";
import { BackupSchema, LogEntrySchema, type Backup, type LogEntry } from "@pl330/shared";

export type Preference = { key: string; value: unknown };
export type RecentSearch = { id: string; createdAt: string; frequencyKHz: number; payload: unknown };
export class PL330Database extends Dexie {
  logs!: EntityTable<LogEntry, "id">; preferences!: EntityTable<Preference, "key">; recentSearches!: EntityTable<RecentSearch, "id">;
  constructor() { super("pl330-companion"); this.version(1).stores({ logs: "id, listenedAtUtc, frequencyKHz, mode, stationName, country, language, favorite, *tags", preferences: "key", recentSearches: "id, createdAt, frequencyKHz" }); }
}
export const db = new PL330Database();

export async function exportBackup(): Promise<Backup> { return { format:"pl330-companion-backup", version:2, exportedAt:new Date().toISOString(), entries:await db.logs.toArray(), preferences:Object.fromEntries((await db.preferences.toArray()).map((p)=>[p.key,p.value])) }; }
export async function importBackup(value: unknown) {
  const backup = BackupSchema.parse(value); const entries = backup.entries.map((entry) => LogEntrySchema.parse(entry));
  await db.transaction("rw", db.logs, db.preferences, async () => { await db.logs.bulkPut(entries); if (backup.preferences) await db.preferences.bulkPut(Object.entries(backup.preferences).map(([key,value])=>({key,value}))); });
  return entries.length;
}
export function toCsv(entries: LogEntry[]) {
  const columns: (keyof LogEntry)[] = ["listenedAtUtc","localDateTime","frequencyKHz","mode","stationName","country","language","transmitter","sinpo","antenna","receptionLocation","content","notes","tags","favorite"];
  const escape = (v: unknown) => `"${String(Array.isArray(v)?v.join(", "):v??"").replaceAll('"','""')}"`;
  return [columns.join(","), ...entries.map((e)=>columns.map((c)=>escape(e[c])).join(","))].join("\n");
}
export function download(name: string, content: string, type = "application/json") { const url=URL.createObjectURL(new Blob([content],{type})); const a=document.createElement("a"); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url); }
