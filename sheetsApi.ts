const API_BASE = "/api";

export async function getCatalogo() {
  const resp = await fetch(
    `${API_BASE}/sheets?range=${encodeURIComponent("catalogo!A:K")}`
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text);
  }

  return resp.json() as Promise<{ values: string[][] }>;
}