export interface DataRecord {
  area: string;
  indicador_id: string;
  indicador_nome: string;
  descricao?: string;
  fonte: string;
  territorio_tipo: 'brasil' | 'uf' | 'municipio';
  territorio_nome: string;
  territorio_codigo?: string;
  periodo?: string;
  categoria?: string;
  valor: number;
  unidade?: string;
  atualizado_em?: string;
}

export interface KPIData {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  change?: number;
  changeLabel?: string;
}

export interface ChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface FilterState {
  area: string | null;
  indicador: string | null;
  fonte: string | null;
  territorio: string | null;
}

export interface IndicatorInfo {
  id: string;
  nome: string;
  descricao?: string;
  area: string;
  fontes: string[];
  territorios: string[];
}

export interface AreaInfo {
  id: string;
  nome: string;
  indicadores: IndicatorInfo[];
}

// ✅ NOVOS TIPOS
export type TipoIndicador = 'quantidade' | 'distribuicao' | 'serie' | 'evolucao';
export type PerfilVisualizacao = 'padrao' | 'pizza';

// ✅ INTERFACE COMPLETA DO CATÁLOGO
export interface CatalogRow {
  area?: string;
  indicador_id?: string;
  indicador_nome?: string;
  fonte?: string;
  fonte_url?: string;
  sheet?: string;
  range?: string;
  tipo?: TipoIndicador;           // ✅ Nova coluna
  perfil?: PerfilVisualizacao;    // ✅ Nova coluna
  titulo?: string;
  unidade?: string;
  territorio_col?: string;
  data_col?: string;
  valor_col?: string;
  territorio_nome?: string;
}