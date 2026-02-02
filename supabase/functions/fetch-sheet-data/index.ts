import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache configuration
let cachedData: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

const SPREADSHEET_ID = "1ZimkWHJnGQ-B2bZ-FLxAJlp6jnab_I_i";

interface SheetRow {
  area: string;
  indicador_id: string;
  indicador_nome: string;
  descricao: string;
  fonte: string;
  territorio_tipo: string;
  territorio_nome: string;
  territorio_codigo: string;
  periodo: string;
  categoria: string;
  valor: number;
  unidade: string;
  atualizado_em: string;
}

async function fetchSheetData(sheetName: string = "Sheet1"): Promise<any[]> {
  // Use Google Sheets public CSV export URL
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  
  console.log(`Fetching data from: ${csvUrl}`);
  
  const response = await fetch(csvUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
  }
  
  const text = await response.text();
  
  // Google returns JSONP-like format, need to extract JSON
  // Format: google.visualization.Query.setResponse({...})
  const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?$/);
  
  if (!jsonMatch) {
    throw new Error("Could not parse Google Sheets response");
  }
  
  const jsonData = JSON.parse(jsonMatch[1]);
  
  if (!jsonData.table) {
    throw new Error("No table data found in response");
  }
  
  // Extract column headers
  const cols = jsonData.table.cols.map((col: any) => col.label || col.id);
  
  // Extract rows
  const rows = jsonData.table.rows.map((row: any) => {
    const obj: Record<string, any> = {};
    row.c.forEach((cell: any, index: number) => {
      const header = cols[index];
      if (header) {
        obj[header] = cell ? (cell.v !== null ? cell.v : cell.f || null) : null;
      }
    });
    return obj;
  });
  
  return rows;
}

function transformToIndicatorData(rawData: any[]): any {
  // Map raw data to expected format
  const data = rawData.map(row => ({
    area: row.area || row.Area || row.AREA || '',
    indicador_id: row.indicador_id || row['Indicador ID'] || row.id || '',
    indicador_nome: row.indicador_nome || row['Indicador'] || row.indicador || row.nome || '',
    descricao: row.descricao || row['Descrição'] || row.Descricao || '',
    fonte: row.fonte || row.Fonte || row.FONTE || '',
    territorio_tipo: row.territorio_tipo || row['Território Tipo'] || row.tipo || '',
    territorio_nome: row.territorio_nome || row['Território'] || row.territorio || '',
    territorio_codigo: row.territorio_codigo || row['Código'] || row.codigo || '',
    periodo: row.periodo || row['Período'] || row.Periodo || row.ano || '',
    categoria: row.categoria || row.Categoria || row.CATEGORIA || '',
    valor: parseFloat(row.valor || row.Valor || row.VALOR || 0) || 0,
    unidade: row.unidade || row.Unidade || row.UNIDADE || '',
    atualizado_em: row.atualizado_em || row['Atualizado em'] || row.data || '',
  }));

  // Extract unique values for filters
  const areas = [...new Set(data.map(d => d.area).filter(Boolean))];
  const indicadores = [...new Set(data.map(d => d.indicador_nome).filter(Boolean))];
  const fontes = [...new Set(data.map(d => d.fonte).filter(Boolean))];
  const territorios = [...new Set(data.map(d => d.territorio_nome).filter(Boolean))];

  return {
    data,
    filters: {
      areas,
      indicadores,
      fontes,
      territorios,
    },
    meta: {
      total_records: data.length,
      last_updated: new Date().toISOString(),
      cache_duration_minutes: CACHE_DURATION_MS / 60000,
    }
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const sheetName = url.searchParams.get('sheet') || 'Sheet1';
    const forceRefresh = url.searchParams.get('refresh') === 'true';
    
    const now = Date.now();
    const cacheValid = cachedData && (now - cacheTimestamp) < CACHE_DURATION_MS;
    
    if (cacheValid && !forceRefresh) {
      console.log('Returning cached data');
      return new Response(JSON.stringify({
        ...cachedData,
        meta: {
          ...cachedData.meta,
          from_cache: true,
          cache_age_seconds: Math.round((now - cacheTimestamp) / 1000),
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('Fetching fresh data from Google Sheets...');
    const rawData = await fetchSheetData(sheetName);
    const transformedData = transformToIndicatorData(rawData);
    
    // Update cache
    cachedData = transformedData;
    cacheTimestamp = now;
    
    console.log(`Fetched ${rawData.length} rows, transformed to ${transformedData.data.length} records`);
    
    return new Response(JSON.stringify({
      ...transformedData,
      meta: {
        ...transformedData.meta,
        from_cache: false,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching sheet data:', errorMessage);
    
    // If we have cached data, return it even if stale
    if (cachedData) {
      console.log('Returning stale cache due to error');
      return new Response(JSON.stringify({
        ...cachedData,
        meta: {
          ...cachedData.meta,
          from_cache: true,
          stale: true,
          error: errorMessage,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({
      error: 'Failed to fetch data',
      message: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
