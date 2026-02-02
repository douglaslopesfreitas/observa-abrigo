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
