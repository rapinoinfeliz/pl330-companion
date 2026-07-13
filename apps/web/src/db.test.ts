import { describe, expect, it } from "vitest";
import { toCsv } from "./db";
import type { LogEntry } from "@pl330/shared";
const entry:LogEntry={id:"00000000-0000-4000-8000-000000000001",listenedAtUtc:"2026-07-13T12:00:00.000Z",localDateTime:"2026-07-13T09:00",frequencyKHz:11780,mode:"AM",stationName:'Rádio "Teste"',country:"B",language:"P",transmitter:"",sinpo:"45444",antenna:"fio",receptionLocation:"casa",content:"notícia",notes:"",tags:["dx"],favorite:true,identificationSource:"manual",createdAt:"2026-07-13T12:00:00.000Z",updatedAt:"2026-07-13T12:00:00.000Z"};
describe("CSV",()=>it("escapa aspas e arrays",()=>{const csv=toCsv([entry]);expect(csv).toContain('"Rádio ""Teste"""');expect(csv).toContain('"dx"')}));
