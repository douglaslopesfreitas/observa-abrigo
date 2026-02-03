const API_BASE = import.meta.env.VITE_SHEETS_API_BASE || "/api";

// catálogo
export async function getCatalogo(range = "catalogo!A:K") {
  const url = `${API_BASE}/sheets?range=${encodeURIComponent(range)}`;
  const res = await fetch(url);

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Falha ao buscar catálogo (${res.status}): ${t}`);
  }

  return res.json() as Promise<{ values: any[][] }>;
}

export async function getIndicador(a: string, b?: string) {
  const finalRange = b ? `${a}!${b}` : a;
  const url = `${API_BASE}/sheets?range=${encodeURIComponent(finalRange)}`;
  const res = await fetch(url);

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Falha ao buscar indicador (${res.status}): ${t}`);
  }

  return res.json() as Promise<{ values: any[][] }>;
}

export async function getIndicadorSheet(aba: string) {
  return getIndicador(aba, "A:Z");
}