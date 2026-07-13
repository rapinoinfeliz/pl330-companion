import type { Broadcast, SearchInput } from "@pl330/shared";
export async function api<T>(path: string): Promise<T> { const response=await fetch(path); if(!response.ok) throw new Error("Não foi possível consultar a fonte agora."); return response.json(); }
export function searchSchedules(input: SearchInput) { const p=new URLSearchParams(Object.entries(input).filter(([,v])=>v!==undefined).map(([k,v])=>[k,String(v)])); return api<{data:Broadcast[];metadata:{queryAt:string}}>(`/api/schedules/search?${p}`); }
