/**
 * Funções para buscar dados da API serverless (/api/sheets)
 */

type SheetsResponse = {
  values: any[][];
};

export const getIndicador = async (range: string): Promise<SheetsResponse> => {
  try {
    const qs = new URLSearchParams({ range });
    const response = await fetch(`/api/sheets?${qs.toString()}`);

    if (!response.ok) {
      throw new Error("Erro ao buscar indicador da planilha");
    }

    return await response.json();
  } catch (error) {
    console.error("Erro no getIndicador:", error);
    throw error;
  }
};

export const getUpdatedAt = async () => {
  try {
    const response = await fetch("/api/sheets");

    if (!response.ok) {
      throw new Error("Erro ao buscar dados da planilha");
    }

    const data = await response.json();
    return data.values;
  } catch (error) {
    console.error("Erro no serviço de sheets:", error);
    return null;
  }
};