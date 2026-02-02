const API_BASE = import.meta.env.VITE_SHEETS_API_BASE || "/api";

// catálogo
export async function getCatalogo(range = "catalogo!A:K") {
  const url = `${API_BASE}/sheets?range=${encodeURIComponent(range)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Falha ao buscar catálogo (${res.status}): ${t}`);
  }
  return res.json();
}

/**
 * Compatível:
 * - getIndicador("acolhidos", "A:Z")
 * - getIndicador("acolhidos!A:Z")
 */
export async function getIndicador(a: string, b?: string) {
  const finalRange = b ? `${a}!${b}` : a;
  const url = `${API_BASE}/sheets?range=${encodeURIComponent(finalRange)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Falha ao buscar indicador (${res.status}): ${t}`);
  }
  return res.json();
}

export async function getIndicadorSheet(aba: string) {
  return getIndicador(aba, "A:Z");
}

export async function getUpdatedAt(): Promise<string> {
  const url = `${API_BASE}/sheets/updated-at`;
  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Falha ao buscar updated-at (${res.status}): ${t}`);
  }
  const data = await res.json();
  return data.modifiedTime;
}