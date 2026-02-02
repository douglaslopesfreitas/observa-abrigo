import { useEffect, useMemo, useState } from "react";
import { getIndicador } from "@/services/sheetsApi";

type CatalogRow = {
  area?: string;
  indicador_id?: string;
  indicador_nome?: string;
  fonte?: string;
  sheet?: string;
  range?: string;
  tipo?: string;
  titulo?: string;
  unidade?: string;
  territorio_col?: string;
};

type Props = {
  catalogo: CatalogRow[];
  indicadorId: string | null;
  fonteSelecionada?: string | null;
  territorioSelecionado?: string | null;
};

function normStr(v: unknown) {
  return String(v ?? "").trim();
}

function parseNumber(v: any) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function valuesToObjects(values: any[][]) {
  if (!Array.isArray(values) || values.length < 2) return [];
  const headers = (values[0] || []).map((h) => String(h ?? "").trim().toLowerCase());
  return values.slice(1).map((row) => {
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => (obj[h] = row?.[i] ?? ""));
    return obj;
  });
}

export function IndicadorViewer({
  catalogo,
  indicadorId,
  fonteSelecionada,
  territorioSelecionado,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [rawValues, setRawValues] = useState<any[][]>([]);
  const [metaDebug, setMetaDebug] = useState<{ sheet?: string; range?: string } | null>(null);

  const meta = useMemo(() => {
    if (!indicadorId) return null;

    // acha a linha do catálogo do indicador
    // se tiver múltiplas fontes no futuro, a gente pode filtrar pela fonteSelecionada
    const rows = catalogo.filter((r) => normStr(r.indicador_id) === indicadorId);

    const chosen =
      fonteSelecionada
        ? rows.find((r) => normStr(r.fonte) === fonteSelecionada) || rows[0]
        : rows[0];

    if (!chosen) return null;

    const sheet = normStr(chosen.sheet);
    const range = normStr(chosen.range);

    return { sheet, range, row: chosen };
  }, [catalogo, indicadorId, fonteSelecionada]);

  useEffect(() => {
    if (!meta?.sheet) return;

    setLoading(true);
    setErro(null);
    setRawValues([]);
    setMetaDebug({ sheet: meta.sheet, range: meta.range });

    // se o range vier vazio, cai no default A:Z
    const sheetRange = meta.range ? `${meta.sheet}!${meta.range}` : `${meta.sheet}!A:Z`;

    getIndicador(sheetRange)
      .then((d) => {
        const v = d.values || [];
        setRawValues(v);
      })
      .catch((e) => {
        setErro(e?.message ? String(e.message) : "Erro ao carregar dados do indicador");
      })
      .finally(() => setLoading(false));
  }, [meta?.sheet, meta?.range]);

  const parsed = useMemo(() => {
    // transforma rows em objetos
    const objs = valuesToObjects(rawValues);

    // já resolve "data mesclada"
    let lastDate = "";
    const out = objs.map((r: any) => {
      const data = normStr(r.data);
      if (data) lastDate = data;

      return {
        territorio: normStr(r.territorio),
        data: data || lastDate,
        modalidade: normStr(r.modalidade),
        valor: parseNumber(r.valor),
        fonte: normStr(r.fonte),
      };
    });

    // aplica filtro de território se existir
    const out2 = territorioSelecionado
      ? out.filter((x) => x.territorio === territorioSelecionado)
      : out;

    return out2;
  }, [rawValues, territorioSelecionado]);

  // monta uma série simples: soma por data (porque seus dados vêm por modalidade)
  const serie = useMemo(() => {
    const m = new Map<string, number>();

    parsed.forEach((r) => {
      if (!r.data) return;
      const prev = m.get(r.data) || 0;
      m.set(r.data, prev + (Number.isFinite(r.valor) ? r.valor : 0));
    });

    return Array.from(m.entries())
      .map(([data, valor]) => ({ data, valor }))
      .sort((a, b) => String(a.data).localeCompare(String(b.data)));
  }, [parsed]);

  if (!indicadorId) return null;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Indicador selecionado</div>
          <div className="text-lg font-semibold">
            {meta?.row?.titulo ? normStr(meta.row.titulo) : meta?.row?.indicador_nome ? normStr(meta.row.indicador_nome) : indicadorId}
          </div>
          <div className="text-sm text-muted-foreground">
            {meta?.row?.unidade ? `Unidade: ${normStr(meta.row.unidade)}` : null}
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-right">
          <div>Sheet: {metaDebug?.sheet || "-"}</div>
          <div>Range: {metaDebug?.range || "A:Z"}</div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando dados…</div>
      ) : erro ? (
        <div className="text-sm text-red-600">{erro}</div>
      ) : rawValues.length < 2 ? (
        <div className="text-sm text-muted-foreground">Sem dados retornados para este indicador.</div>
      ) : (
        <>
          {/* “Gráfico” simples: lista como fallback + mini barra visual */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Série (soma por data)</div>

            {serie.slice(-12).map((p) => {
              const max = Math.max(...serie.map((x) => x.valor), 1);
              const pct = Math.round((p.valor / max) * 100);

              return (
                <div key={p.data} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-muted-foreground">{p.data}</div>
                  <div className="flex-1 h-2 bg-muted rounded">
                    <div className="h-2 bg-primary rounded" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="w-24 text-right text-sm">{p.valor}</div>
                </div>
              );
            })}
          </div>

          {/* tabela de debug para nunca ficar “em branco” */}
          <div className="pt-4">
            <div className="text-sm font-medium mb-2">Prévia dos dados (debug)</div>
            <div className="overflow-auto border rounded-lg">
              <table className="min-w-[700px] w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    {(rawValues[0] || []).map((h: any, i: number) => (
                      <th key={i} className="text-left p-2 font-medium">
                        {String(h ?? "")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rawValues.slice(1, 11).map((row: any[], ri: number) => (
                    <tr key={ri} className="border-t">
                      {row.map((c: any, ci: number) => (
                        <td key={ci} className="p-2">
                          {String(c ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}