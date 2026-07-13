import { describe, expect, it } from "vitest";
import { parseEibiCsv } from "../src/eibi";
import { parseNoaa } from "../src/noaa";

describe("parser EiBi", () => {
  const header = "kHz:75;Time(UTC):93;Days:59;ITU:49;Station:201;Lng:49;Target:62;Remarks:135;P:35;Start:60;Stop:60;";
  it("aceita decimal, dias e virada", async () => { const r = await parseEibiCsv(`${header}\n11780.5;2300-0100;Mo-Fr;ROU;Radio Romania;P;SAm;;t;;;`, "A26", "fixture"); expect(r.rows[0]).toMatchObject({frequencyKHz:11780.5,startUtcMinutes:1380,endUtcMinutes:60,days:[1,2,3,4,5]}); });
  it("isola linha inválida e duplicata", async () => { const row = "11780;0000-2400;;ROU;Radio Romania;P;SAm;;t;;;"; const r = await parseEibiCsv(`${header}\n${row}\n${row}\nX;0000-2400;;B;;P;;;;;;`, "A26", "fixture"); expect(r.duplicates).toBe(1); expect(r.invalid).toHaveLength(1); });
  it("rejeita cabeçalho alterado", async () => expect(parseEibiCsv("foo;bar", "A26", "fixture")).rejects.toThrow("Cabeçalho"));
});
describe("NOAA", () => {
  it("interpreta Kp e F10.7 reais", () => { expect(parseNoaa("kp", [{time_tag:"2026-01-01",Kp:2.67,a_running:12,station_count:7}])).toHaveLength(1); expect(parseNoaa("f107", [{time_tag:"2026-01-01",flux:128}])).toHaveLength(1); });
  it("rejeita schema incompleto", () => expect(() => parseNoaa("kp", [{x:1}])).toThrow());
});
