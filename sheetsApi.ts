const API_BASE = import.meta.env.VITE_SHEETS_API_BASE || "http://localhost:8787";

export async function getCatalogo() {
  const resp = await fetch(`${API_BASE}/api/sheets?range=${encodeURIComponent("catalogo!A:K")}`);

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text);
  }

  return resp.json() as Promise<{ range: string; values: string[][] }>;
}