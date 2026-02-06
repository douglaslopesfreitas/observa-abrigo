/**
 * Funções para buscar dados da API serverless (/api/sheets)
 */
type SheetsResponse = {
  values: any[][];
  updatedAt?: string | null;
};

async function fetchSheets(range?: string): Promise<SheetsResponse> {
  const qs = range ? `?${new URLSearchParams({ range }).toString()}` : "";
  const response = await fetch(`/api/sheets${qs}`);
  if (!response.ok) {
    throw new Error("Erro ao buscar dados da planilha");
  }
  return await response.json();
}

export const getIndicador = async (range: string): Promise<SheetsResponse> => {
  try {
    return await fetchSheets(range);
  } catch (error) {
    console.error("Erro no getIndicador:", error);
    throw error;
  }
};

export const getCatalogo = async (
  range = "catalogo!A:Z"
): Promise<SheetsResponse> => {
  try {
    return await fetchSheets(range);
  } catch (error) {
    console.error("Erro no getCatalogo:", error);
    throw error;
  }
};

export const getIndicadorSheet = async (
  sheetName: string
): Promise<SheetsResponse> => {
  try {
    const sheet = String(sheetName || "").trim();
    if (!sheet) throw new Error("sheetName vazio em getIndicadorSheet");
    return await fetchSheets(`${sheet}!A:Z`);
  } catch (error) {
    console.error("Erro no getIndicadorSheet:", error);
    throw error;
  }
};

export const getUpdatedAt = async (): Promise<string | null> => {
  try {
    const data = await fetchSheets();
    return data.updatedAt ?? null;
  } catch (error) {
    console.error("Erro no getUpdatedAt:", error);
    return null;
  }
};
