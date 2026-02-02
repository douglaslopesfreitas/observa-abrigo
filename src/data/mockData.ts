import type { DataRecord, KPIData, AreaInfo } from '@/types/dashboard';

// Mock data simulating the expected data structure
export const mockDataRecords: DataRecord[] = [
  // Perfil - Faixa Etária
  { area: 'Perfil', indicador_id: 'faixa_etaria', indicador_nome: 'Acolhidos por Faixa Etária', descricao: 'Distribuição de crianças e adolescentes acolhidos por faixa etária', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: '0-3 anos', valor: 8500, unidade: 'pessoas', atualizado_em: '2024-01-15' },
  { area: 'Perfil', indicador_id: 'faixa_etaria', indicador_nome: 'Acolhidos por Faixa Etária', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: '4-6 anos', valor: 7200, unidade: 'pessoas', atualizado_em: '2024-01-15' },
  { area: 'Perfil', indicador_id: 'faixa_etaria', indicador_nome: 'Acolhidos por Faixa Etária', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: '7-11 anos', valor: 12800, unidade: 'pessoas', atualizado_em: '2024-01-15' },
  { area: 'Perfil', indicador_id: 'faixa_etaria', indicador_nome: 'Acolhidos por Faixa Etária', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: '12-15 anos', valor: 14500, unidade: 'pessoas', atualizado_em: '2024-01-15' },
  { area: 'Perfil', indicador_id: 'faixa_etaria', indicador_nome: 'Acolhidos por Faixa Etária', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: '16-17 anos', valor: 9800, unidade: 'pessoas', atualizado_em: '2024-01-15' },
  
  // Perfil - Sexo
  { area: 'Perfil', indicador_id: 'sexo', indicador_nome: 'Acolhidos por Sexo', descricao: 'Distribuição por sexo dos acolhidos', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: 'Masculino', valor: 27400, unidade: 'pessoas', atualizado_em: '2024-01-15' },
  { area: 'Perfil', indicador_id: 'sexo', indicador_nome: 'Acolhidos por Sexo', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: 'Feminino', valor: 25400, unidade: 'pessoas', atualizado_em: '2024-01-15' },

  // Perfil - Raça/Cor
  { area: 'Perfil', indicador_id: 'raca_cor', indicador_nome: 'Acolhidos por Raça/Cor', descricao: 'Distribuição por raça/cor autodeclarada', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: 'Branca', valor: 18200, unidade: 'pessoas', atualizado_em: '2024-01-15' },
  { area: 'Perfil', indicador_id: 'raca_cor', indicador_nome: 'Acolhidos por Raça/Cor', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: 'Preta', valor: 8900, unidade: 'pessoas', atualizado_em: '2024-01-15' },
  { area: 'Perfil', indicador_id: 'raca_cor', indicador_nome: 'Acolhidos por Raça/Cor', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: 'Parda', valor: 23500, unidade: 'pessoas', atualizado_em: '2024-01-15' },
  { area: 'Perfil', indicador_id: 'raca_cor', indicador_nome: 'Acolhidos por Raça/Cor', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: 'Amarela', valor: 800, unidade: 'pessoas', atualizado_em: '2024-01-15' },
  { area: 'Perfil', indicador_id: 'raca_cor', indicador_nome: 'Acolhidos por Raça/Cor', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: 'Indígena', valor: 1400, unidade: 'pessoas', atualizado_em: '2024-01-15' },

  // Estrutura - Total de Unidades
  { area: 'Estrutura', indicador_id: 'total_unidades', indicador_nome: 'Total de Unidades de Acolhimento', descricao: 'Número total de instituições de acolhimento', fonte: 'Censo SUAS 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', valor: 4892, unidade: 'unidades', atualizado_em: '2024-01-15' },
  { area: 'Estrutura', indicador_id: 'total_unidades', indicador_nome: 'Total de Unidades de Acolhimento', fonte: 'Censo SUAS 2023', territorio_tipo: 'uf', territorio_nome: 'São Paulo', territorio_codigo: 'SP', periodo: '2023', valor: 1245, unidade: 'unidades', atualizado_em: '2024-01-15' },
  { area: 'Estrutura', indicador_id: 'total_unidades', indicador_nome: 'Total de Unidades de Acolhimento', fonte: 'Censo SUAS 2023', territorio_tipo: 'uf', territorio_nome: 'Rio de Janeiro', territorio_codigo: 'RJ', periodo: '2023', valor: 587, unidade: 'unidades', atualizado_em: '2024-01-15' },
  { area: 'Estrutura', indicador_id: 'total_unidades', indicador_nome: 'Total de Unidades de Acolhimento', fonte: 'Censo SUAS 2023', territorio_tipo: 'uf', territorio_nome: 'Minas Gerais', territorio_codigo: 'MG', periodo: '2023', valor: 498, unidade: 'unidades', atualizado_em: '2024-01-15' },
  { area: 'Estrutura', indicador_id: 'total_unidades', indicador_nome: 'Total de Unidades de Acolhimento', fonte: 'Censo SUAS 2023', territorio_tipo: 'uf', territorio_nome: 'Rio Grande do Sul', territorio_codigo: 'RS', periodo: '2023', valor: 412, unidade: 'unidades', atualizado_em: '2024-01-15' },
  { area: 'Estrutura', indicador_id: 'total_unidades', indicador_nome: 'Total de Unidades de Acolhimento', fonte: 'Censo SUAS 2023', territorio_tipo: 'uf', territorio_nome: 'Paraná', territorio_codigo: 'PR', periodo: '2023', valor: 378, unidade: 'unidades', atualizado_em: '2024-01-15' },

  // Estrutura - Tipo de Unidade
  { area: 'Estrutura', indicador_id: 'tipo_unidade', indicador_nome: 'Unidades por Tipo', descricao: 'Distribuição por tipo de unidade de acolhimento', fonte: 'Censo SUAS 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: 'Abrigo Institucional', valor: 3245, unidade: 'unidades', atualizado_em: '2024-01-15' },
  { area: 'Estrutura', indicador_id: 'tipo_unidade', indicador_nome: 'Unidades por Tipo', fonte: 'Censo SUAS 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: 'Casa-Lar', valor: 1247, unidade: 'unidades', atualizado_em: '2024-01-15' },
  { area: 'Estrutura', indicador_id: 'tipo_unidade', indicador_nome: 'Unidades por Tipo', fonte: 'Censo SUAS 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: 'República', valor: 400, unidade: 'unidades', atualizado_em: '2024-01-15' },

  // Série temporal - Acolhidos por ano
  { area: 'Perfil', indicador_id: 'serie_temporal', indicador_nome: 'Evolução do Acolhimento', descricao: 'Série histórica de crianças e adolescentes acolhidos', fonte: 'CNCA', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2018', valor: 47000, unidade: 'pessoas', atualizado_em: '2024-01-15' },
  { area: 'Perfil', indicador_id: 'serie_temporal', indicador_nome: 'Evolução do Acolhimento', fonte: 'CNCA', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2019', valor: 48500, unidade: 'pessoas', atualizado_em: '2024-01-15' },
  { area: 'Perfil', indicador_id: 'serie_temporal', indicador_nome: 'Evolução do Acolhimento', fonte: 'CNCA', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2020', valor: 46200, unidade: 'pessoas', atualizado_em: '2024-01-15' },
  { area: 'Perfil', indicador_id: 'serie_temporal', indicador_nome: 'Evolução do Acolhimento', fonte: 'CNCA', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2021', valor: 49800, unidade: 'pessoas', atualizado_em: '2024-01-15' },
  { area: 'Perfil', indicador_id: 'serie_temporal', indicador_nome: 'Evolução do Acolhimento', fonte: 'CNCA', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2022', valor: 51200, unidade: 'pessoas', atualizado_em: '2024-01-15' },
  { area: 'Perfil', indicador_id: 'serie_temporal', indicador_nome: 'Evolução do Acolhimento', fonte: 'CNCA', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', valor: 52800, unidade: 'pessoas', atualizado_em: '2024-01-15' },

  // Educação
  { area: 'Educação', indicador_id: 'frequencia_escolar', indicador_nome: 'Frequência Escolar', descricao: 'Percentual de acolhidos frequentando escola', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: 'Frequentando', valor: 89.5, unidade: '%', atualizado_em: '2024-01-15' },
  { area: 'Educação', indicador_id: 'frequencia_escolar', indicador_nome: 'Frequência Escolar', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: 'Não frequentando', valor: 10.5, unidade: '%', atualizado_em: '2024-01-15' },
  { area: 'Educação', indicador_id: 'frequencia_escolar', indicador_nome: 'Frequência Escolar', fonte: 'CNCA 2023', territorio_tipo: 'uf', territorio_nome: 'São Paulo', territorio_codigo: 'SP', periodo: '2023', categoria: 'Frequentando', valor: 92.3, unidade: '%', atualizado_em: '2024-01-15' },
  { area: 'Educação', indicador_id: 'frequencia_escolar', indicador_nome: 'Frequência Escolar', fonte: 'CNCA 2023', territorio_tipo: 'uf', territorio_nome: 'São Paulo', territorio_codigo: 'SP', periodo: '2023', categoria: 'Não frequentando', valor: 7.7, unidade: '%', atualizado_em: '2024-01-15' },

  // Saúde
  { area: 'Saúde', indicador_id: 'deficiencia', indicador_nome: 'Acolhidos com Deficiência', descricao: 'Percentual de acolhidos com algum tipo de deficiência', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: 'Física', valor: 3.2, unidade: '%', atualizado_em: '2024-01-15' },
  { area: 'Saúde', indicador_id: 'deficiencia', indicador_nome: 'Acolhidos com Deficiência', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: 'Intelectual', valor: 8.7, unidade: '%', atualizado_em: '2024-01-15' },
  { area: 'Saúde', indicador_id: 'deficiencia', indicador_nome: 'Acolhidos com Deficiência', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: 'Múltipla', valor: 2.1, unidade: '%', atualizado_em: '2024-01-15' },
  { area: 'Saúde', indicador_id: 'deficiencia', indicador_nome: 'Acolhidos com Deficiência', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: 'Sem deficiência', valor: 86.0, unidade: '%', atualizado_em: '2024-01-15' },

  // Proteção - Motivo de acolhimento
  { area: 'Proteção', indicador_id: 'motivo_acolhimento', indicador_nome: 'Motivo do Acolhimento', descricao: 'Principais motivos que levaram ao acolhimento institucional', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: 'Negligência', valor: 38.5, unidade: '%', atualizado_em: '2024-01-15' },
  { area: 'Proteção', indicador_id: 'motivo_acolhimento', indicador_nome: 'Motivo do Acolhimento', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: 'Pais/resp. dependentes químicos', valor: 24.8, unidade: '%', atualizado_em: '2024-01-15' },
  { area: 'Proteção', indicador_id: 'motivo_acolhimento', indicador_nome: 'Motivo do Acolhimento', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: 'Abandono', valor: 15.2, unidade: '%', atualizado_em: '2024-01-15' },
  { area: 'Proteção', indicador_id: 'motivo_acolhimento', indicador_nome: 'Motivo do Acolhimento', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: 'Violência doméstica', valor: 12.3, unidade: '%', atualizado_em: '2024-01-15' },
  { area: 'Proteção', indicador_id: 'motivo_acolhimento', indicador_nome: 'Motivo do Acolhimento', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: 'Outros', valor: 9.2, unidade: '%', atualizado_em: '2024-01-15' },

  // Assistência Social - Tempo de acolhimento
  { area: 'Assistência Social', indicador_id: 'tempo_acolhimento', indicador_nome: 'Tempo de Acolhimento', descricao: 'Distribuição por tempo de permanência em acolhimento', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: 'Até 6 meses', valor: 22.4, unidade: '%', atualizado_em: '2024-01-15' },
  { area: 'Assistência Social', indicador_id: 'tempo_acolhimento', indicador_nome: 'Tempo de Acolhimento', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: '6 meses a 1 ano', valor: 18.7, unidade: '%', atualizado_em: '2024-01-15' },
  { area: 'Assistência Social', indicador_id: 'tempo_acolhimento', indicador_nome: 'Tempo de Acolhimento', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: '1 a 2 anos', valor: 24.3, unidade: '%', atualizado_em: '2024-01-15' },
  { area: 'Assistência Social', indicador_id: 'tempo_acolhimento', indicador_nome: 'Tempo de Acolhimento', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: '2 a 5 anos', valor: 23.8, unidade: '%', atualizado_em: '2024-01-15' },
  { area: 'Assistência Social', indicador_id: 'tempo_acolhimento', indicador_nome: 'Tempo de Acolhimento', fonte: 'CNCA 2023', territorio_tipo: 'brasil', territorio_nome: 'Brasil', periodo: '2023', categoria: 'Mais de 5 anos', valor: 10.8, unidade: '%', atualizado_em: '2024-01-15' },
];

export const overviewKPIs: KPIData[] = [
  { id: 'total_acolhidos', label: 'Crianças e Adolescentes Acolhidos', value: 52800, unit: 'pessoas', change: 3.1, changeLabel: 'vs. 2022' },
  { id: 'total_unidades', label: 'Unidades de Acolhimento', value: 4892, unit: 'unidades', change: 2.4, changeLabel: 'vs. 2022' },
  { id: 'taxa_frequencia', label: 'Frequência Escolar', value: '89,5%', change: 1.2, changeLabel: 'vs. 2022' },
  { id: 'tempo_medio', label: 'Tempo Médio de Acolhimento', value: '1,8 anos', change: -0.5, changeLabel: 'vs. 2022' },
];

export const getAreas = (): AreaInfo[] => {
  const areasMap = new Map<string, AreaInfo>();
  
  mockDataRecords.forEach(record => {
    if (!areasMap.has(record.area)) {
      areasMap.set(record.area, {
        id: record.area.toLowerCase().replace(/\s+/g, '_'),
        nome: record.area,
        indicadores: []
      });
    }
    
    const area = areasMap.get(record.area)!;
    const existingIndicator = area.indicadores.find(i => i.id === record.indicador_id);
    
    if (!existingIndicator) {
      const indicatorRecords = mockDataRecords.filter(r => r.indicador_id === record.indicador_id);
      const fontes = [...new Set(indicatorRecords.map(r => r.fonte))];
      const territorios = [...new Set(indicatorRecords.map(r => record.territorio_nome))];
      
      area.indicadores.push({
        id: record.indicador_id,
        nome: record.indicador_nome,
        descricao: record.descricao,
        area: record.area,
        fontes,
        territorios
      });
    }
  });
  
  return Array.from(areasMap.values());
};

export const getIndicatorsByArea = (area: string) => {
  return mockDataRecords
    .filter(r => r.area === area)
    .reduce((acc, r) => {
      if (!acc.find(i => i.id === r.indicador_id)) {
        const indicatorRecords = mockDataRecords.filter(rec => rec.indicador_id === r.indicador_id);
        const fontes = [...new Set(indicatorRecords.map(rec => rec.fonte))];
        const territorios = [...new Set(indicatorRecords.map(rec => rec.territorio_nome))];
        
        acc.push({
          id: r.indicador_id,
          nome: r.indicador_nome,
          descricao: r.descricao,
          area: r.area,
          fontes,
          territorios
        });
      }
      return acc;
    }, [] as { id: string; nome: string; descricao?: string; area: string; fontes: string[]; territorios: string[] }[]);
};

export const getFontesByIndicator = (indicadorId: string) => {
  return [...new Set(mockDataRecords.filter(r => r.indicador_id === indicadorId).map(r => r.fonte))];
};

export const getTerritoriosByIndicator = (indicadorId: string, fonte?: string) => {
  let records = mockDataRecords.filter(r => r.indicador_id === indicadorId);
  if (fonte) {
    records = records.filter(r => r.fonte === fonte);
  }
  return [...new Set(records.map(r => r.territorio_nome))];
};

export const getIndicatorData = (indicadorId: string, fonte?: string, territorio?: string) => {
  let records = mockDataRecords.filter(r => r.indicador_id === indicadorId);
  if (fonte) records = records.filter(r => r.fonte === fonte);
  if (territorio) records = records.filter(r => r.territorio_nome === territorio);
  return records;
};
