
/**
 * Função para buscar os dados da nossa API Serverless na Vercel
 * e retornar a última atualização ou os dados brutos.
 */
export const getUpdatedAt = async () => {
  try {
    // Chamamos a rota que criamos na pasta /api/sheets
    const response = await fetch('/api/sheets');
    
    if (!response.ok) {
      throw new Error('Erro ao buscar dados da planilha');
    }

    const data = await response.json();

    // Aqui retornamos os dados. 
    // Se o seu DashboardFooter espera uma data específica, 
    // você pode ajustar o retorno abaixo:
    return data.values; 
  } catch (error) {
    console.error("Erro no serviço de sheets:", error);
    return null;
  }
};

/**
 * Se você tiver outras funções que o dashboard usa, 
 * como buscar categorias ou valores específicos, adicione-as abaixo
 * sempre usando o 'export const'.
 */
