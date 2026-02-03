// src/services/sheetsApi.ts

/**
 * Busca os dados da planilha e retorna a data de atualização.
 * O componente DashboardFooter espera uma string ISO de data.
 */
export const getUpdatedAt = async (): Promise<string> => {
  try {
    const response = await fetch('/api/sheets');
    
    if (!response.ok) {
      throw new Error('Erro ao conectar com a API');
    }

    const data = await response.json();

    // Se a sua planilha tem a data de atualização em uma célula específica, 
    // ajuste aqui. Ex: data.values[0][0] (Primeira linha, primeira coluna)
    // Se não tiver, vamos retornar a data atual do sistema como fallback:
    const lastDate = data.values && data.values.length > 0 
      ? data.values[0][0] // Pega o valor da célula A1
      : new Date().toISOString();

    return lastDate;
  } catch (error) {
    console.error("Erro no serviço de sheets:", error);
    throw error; // Repassa o erro para o .catch do componente
  }
};
