// src/services/sheetsApi.ts

type SheetsResponse = {
  values?: any[][];
};

const API_URL = "/api/sheets";

// normaliza pra comparar (remove acento, lower, etc)
function norm(s: unknown) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// coloca aspas no nome da aba (A1 notation) e escapa aspas simples
function quoteSheetName(sheetName: string) {
  const escaped = sheetName.replace(/'/g, "''");
  return `'${escaped}'`;
}

// ✅ Aliases do FRONT -> nome REAL da aba no Sheets
// (conforme você descreveu agora)
const SHEET_ALIAS_MAP: Record<string, string> = {
  // alfabetização vem de "educacao"
  alfabetizacao: "educacao",
  alfabetização: "educacao",
  educacao: "educacao",

  // recorte racial vem de "raça"
  raca: "raça",
  raça: "raça",

  // tratamento psicológico vem de "saude"
  psicologico: "saude",
  psicologia: "saude",
  saude: "saude",
  saúde: "saude",

  // violência vem de "violencia"
  violencia: "violencia",
  violências: "violencia",
};

function resolveSheetName(input: string) {
  const key = norm(input);
  return SHEET_ALIAS_MAP[key] ?? input;
}

// Monta range no formato A1: 'Nome da Aba'!A:Z
function buildRange(sheetOrRange: string) {
  const s = String(sheetOrRange || "").trim();

  // se já veio completo (tem !), só garante aspas no nome da aba
  if (s.includes("!")) {
    const [sheetPart, rest] = s.split("!");
    const realSheet = resolveSheetName(sheetPart.trim());

    const alreadyQuoted =
      realSheet.startsWith("'") && realSheet.endsWith("'");

    const safeSheet = alreadyQuoted ? realSheet : quoteSheetName(realSheet);
    return `${safeSheet}!${rest}`;
  }

  // se veio só a aba (ex: "alfabetizacao"), resolve + põe aspas
  const realSheet = resolveSheetName(s);
  return `${quoteSheetName(realSheet)}!A:Z`;
}

async function fetchSheets(rangeOrSheet: string): Promise<SheetsResponse> {
  const range = buildRange(rangeOrSheet);
  const url = `${API_URL}?range=${encodeURIComponent(range)}`;

  const r = await fetch(url);
  if (!r.ok) {
    let extra = "";
    try {
      extra = await r.text();
    } catch {}
    throw new Error(`Erro ao buscar dados da planilha (${r.status}): ${extra}`);
  }
  return r.json();
}

// Mantém assinaturas que você já usa
export async function getCatalogo(rangeOrSheet: string) {
  return fetchSheets(rangeOrSheet);
}

export async function getIndicadorSheet(sheetName: string) {
  // você chama getIndicadorSheet("alfabetizacao"), "raca", "saude", "violencia" etc.
  return fetchSheets(sheetName);
}

// Se você usa getIndicador("aba!A:Z") em algum lugar, mantém também:
export async function getIndicador(rangeOrSheet: string) {
  return fetchSheets(rangeOrSheet);
}