const endpoint = process.env.PL330_API_URL || "http://127.0.0.1:8787";
const secret = process.env.ADMIN_SECRET;
if (!secret) throw new Error("Defina ADMIN_SECRET antes da importação.");
const response = await fetch(`${endpoint}/api/admin/import-eibi`, { method: "POST", headers: { Authorization: `Bearer ${secret}` } });
const body = await response.text();
if (!response.ok) throw new Error(`Importação falhou (${response.status}): ${body}`);
console.log(body);
