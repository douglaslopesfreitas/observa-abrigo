import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import type { CatalogRow, FilterState } from "@/types/dashboard";
import { getIndicador } from "@/services/sheetsApi";

// ✅ 1. Mantendo sua estrutura de tipos original e garantindo que tipo/perfil existam
type ExtendedCatalogRow = CatalogRow & {
  area?: string;
  indicador_id?: string;
  indicador_nome?: string;
  fonte?: string;
  territorio_nome?: string;
  tipo?: string;   
  perfil?: string; 
  sheet?: string;
  range?: string;
  titulo?: string;
  unidade?: string;
  nota_explicativa?: string;
  fonte_url?: string;
};

const PRIMARY_COLOR = "#359AD4";

// ✅ Suas cores originais mantidas exatamente
const CHART_COLORS = [
  "#2674a0", // Azul
  "#E67310", // Laranja Escuro
  "#72C0F8", // Azul Claro
  "#FFCE19", // Amarelo
  "#175070", // Azul Profundo
  "#FA841E", // Laranja Vivo
  "#C9E3FC", // Azul Pálido
  "#FFB114", // Amarelo Ouro
  "#0A2E43", // Navy
  "#9F5125", // Marrom
  "#f7efba", // Creme
  "#02121E", // Dark
];

type ParsedRow = {
  territorio: string;
  data: string;
  categoria: string;
  valor: number | null;
  fonte: string;
};

type ViewMode = "foto" | "evolucao" | "composicao";

const TOTAL_LABEL = "Total";

// ✅ Seu componente original mantido intacto
const RoundedTopBar = (props: any) => {
  const { x, y, width, height, fill, payload, dataKey } = props;
  if (!height || height <= 0) return null;

  // Verifica se esta categoria é a que está no topo desta barra específica no tempo
  const isTop = payload.__top === dataKey;
  const radius = 6;

  if (isTop) {
    return (
      <path
        d={`M${x},${y + radius} 
           Q${x},${y} ${x + radius},${y} 
           L${x + width - radius},${y} 
           Q${x + width},${y} ${x + width},${y + radius} 
           L${x + width},${y + height} 
           L${x},${y + height} Z`}
        fill={fill}
      />
    );
  }
  return <rect x={x} y={y} width={width} height={height} fill={fill} />;
};

// Retorna null quando a célula está vazia, para não confundir com 0
function parseNumber(v: unknown): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Normaliza cabeçalhos para comparação robusta
function normalizeHeader(h: any): string {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") 
    .replace(/\s+/g, "_") 
    .replace(/[^\w]/g, "_") 
    .replace(/_+/g, "_") 
    .replace(/^_+|_+$/g, ""); 
}

function formatDateBR(iso: string) {
  const s = String(iso || "").trim();
  if (!s) return "";
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
}

function sumVals(arr: Array<number | null>) {
  return arr.reduce((acc, v) => acc + (typeof v === "number" ? v : 0), 0);
}

// ✅ Fonte original mantida
function FonteLine({ fonte, url }: { fonte?: string; url?: string }) {
  if (!fonte) return null;

  return (
    <div className="text-sm text-muted-foreground">
      Fonte:{" "}
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:opacity-80"
        >
          {fonte}
        </a>
      ) : (
        fonte
      )}
    </div>
  );
}

// Tooltip original mantido intacto
function CompositionTooltip({
  active,
  payload,
  label,
  unidade,
}: {
  active?: boolean;
  payload?: any[];
  label?: any;
  unidade?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const rows = payload
    .map((p) => ({
      name: String(p?.name ?? ""),
      value: typeof p?.value === "number" ? p.value : Number(p?.value ?? 0),
      color: String(p?.color ?? ""),
    }))
    .filter((p) => Number.isFinite(p.value) && p.value > 0);

  if (rows.length === 0) return null;

  const total = rows.reduce((acc, r) => acc + r.value, 0);

  return (
    <div
      style={{
        backgroundColor: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "12px",
        padding: "10px 12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        minWidth: 260,
      }}
    >
      <div
        style={{
          fontSize: 12,
          marginBottom: 8,
          color: "hsl(var(--foreground))",
          fontWeight: 500,
        }}
      >
        {formatDateBR(String(label))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((r) => (
          <div
            key={r.name}
            style={{
              display: "flex",
              justifyContent: "space-between", gap: 12, fontSize: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 10, height: 10, borderRadius: 3, background: r.color, display: "inline-block",
                }}
              />
              <span style={{ color: "hsl(var(--foreground))" }}>{r.name}</span>
            </div>

            <span style={{ color: "hsl(var(--foreground))" }}>
              {r.value.toLocaleString("pt-BR")}
              {unidade ? ` ${unidade}` : ""}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 10, paddingTop: 8, borderTop: "1px solid hsl(var(--border))", display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))",
        }}
      >
        <span>Total</span>
        <span>
          {total.toLocaleString("pt-BR")}
          {unidade ? ` ${unidade}` : ""}
        </span>
      </div>
    </div>
  );
}

export function IndicatorResults({
  filters,
  catalogo,
}: {
  filters: FilterState;
  catalogo: ExtendedCatalogRow[];
}) {
  const [view, setView] = useState<ViewMode>("foto");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [updatedAtBR, setUpdatedAtBR] = useState<string | null>(null);

  const meta = useMemo(() => {
    if (!filters.indicador) return null;
    return catalogo.find((c) => c.indicador_id === filters.indicador) || null;
  }, [filters.indicador, catalogo]);

  const isFaixaEtaria = useMemo(() => {
    const id = String(filters.indicador || "").toLowerCase();
    const name = String(meta?.indicador_nome || meta?.titulo || "").toLowerCase();
    const joined = `${id} ${name}`;

    return (
      joined.includes("faixa") &&
      (joined.includes("etaria") || joined.includes("etária") || joined.includes("et"))
    );
  }, [filters.indicador, meta?.indicador_nome, meta?.titulo]);

  useEffect(() => {
    if (filters.indicador) setView("foto");
  }, [filters.indicador]);

  useEffect(() => {
    if (!meta?.sheet || !meta?.range) {
      setRows([]);
      return;
    }

    setLoading(true);
    setErr(null);

    const sheetRange = `${meta.sheet}!${meta.range}`;

    getIndicador(sheetRange)
      .then((resp) => {
        const vals = resp.values || [];
        if (vals.length < 2) {
          setRows([]);
          return;
        }

        const headers = (vals[0] || []).map(normalizeHeader);
        const body = vals.slice(1);

        const idxTerr = headers.indexOf("territorio");
        const idxData = headers.indexOf("data");
        const idxVal = headers.indexOf("valor");
        const idxFonte = headers.indexOf("fonte");

        let idxCat = headers.indexOf("categoria");
        if (idxCat < 0) {
          const candidatos = [
            "modalidade", "faixa", "raca", "alfabetizacao", "atendimento_psicologico",
          ].map(normalizeHeader);

          for (const c of candidatos) {
            const i = headers.indexOf(c);
            if (i >= 0) {
              idxCat = i;
              break;
            }
          }
        }

        if (idxCat < 0) {
          idxCat = headers.findIndex((h, i) => {
            if (!h) return false;
            if (i === idxTerr || i === idxData || i === idxVal || i === idxFonte) return false;
            return true;
          });
        }

        if (idxTerr < 0 || idxData < 0 || idxVal < 0) {
          setErr("Colunas obrigatórias ausentes (territorio, data, valor)");
          setRows([]);
          return;
        }

        let lastDate = "";
        const parsed: ParsedRow[] = body.map((r) => {
          const dataStr = String(r[idxData] ?? "").trim();
          if (dataStr) lastDate = dataStr;

          const categoria =
            idxCat >= 0 ? String(r[idxCat] ?? "").trim() : "Geral";

          return {
            territorio: String(r[idxTerr] ?? "").trim(),
            data: dataStr || lastDate,
            categoria: categoria || "Geral",
            valor: parseNumber(r[idxVal]),
            fonte: idxFonte >= 0 ? String(r[idxFonte] ?? "").trim() : "",
          };
        });

        setRows(parsed);
      })
      .catch((e) => {
        setErr(String(e?.message || "Erro ao carregar"));
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [meta?.sheet, meta?.range]);

  const territorioSel = filters.territorio || "RJ";

  const filtered = useMemo(() => {
    const base = rows.filter((r) => r.territorio === territorioSel);
    if (filters.fonte) return base.filter((r) => r.fonte === filters.fonte);
    return base;
  }, [rows, territorioSel, filters.fonte]);

  const dates = useMemo(() => {
    const ds = Array.from(new Set(filtered.map((r) => r.data).filter(Boolean)));
    ds.sort();
    return ds;
  }, [filtered]);

  const lastDate = dates[dates.length - 1] || "";

  const modalities = useMemo(() => {
    const set = new Set<string>();
    filtered.forEach((r) => {
      if (r.categoria && r.categoria !== TOTAL_LABEL) set.add(r.categoria);
    });
    return Array.from(set);
  }, [filtered]);

  // ✅ 2. CORREÇÃO DA LÓGICA DO BANNER (Calculando total manualmente se necessário)
  const fotografiaAtual = useMemo(() => {
    if (!lastDate) return null;

    const totalRow = filtered.find(
      (r) => r.data === lastDate && r.categoria?.toLowerCase() === "total"
    );
    
    const isHorizontalPct = meta?.perfil === "barras_horizontais_percentual";
    
    const byMod = new Map<string, number>();
    filtered
      .filter((r) => r.data === lastDate && r.categoria && r.categoria.toLowerCase() !== "total")
      .forEach((r) => {
        const v = typeof r.valor === "number" ? r.valor : 0;
        byMod.set(r.categoria, (byMod.get(r.categoria) || 0) + v);
      });

    const categoriesFound = Array.from(byMod.entries()).filter(([, v]) => v > 0);
    const sumOfCategories = categoriesFound.reduce((acc, [, v]) => acc + v, 0);
    
    // O divisor/total do banner será a linha "Total" ou a soma das partes
    const finalTotal = (totalRow && typeof totalRow.valor === "number") 
      ? totalRow.valor 
      : sumOfCategories;

    const fotoData = categoriesFound
      .map(([name, value]) => {
        const finalValue = (isHorizontalPct && finalTotal > 0)
          ? (value / finalTotal) * 100
          : value;

        return { name, value: finalValue };
      })
      .sort((a, b) => b.value - a.value);

    return {
      data: lastDate,
      total: finalTotal,
      fotoData,
    };
  }, [filtered, lastDate, meta?.perfil]);

  // ===== Evolução original mantida =====
  const lineData = useMemo(() => {
    if (!dates.length) return [];
    return dates.map((d) => {
      const totalRow = filtered.find(
        (r) => r.data === d && r.categoria === TOTAL_LABEL
      );

      const total =
        totalRow && typeof totalRow.valor === "number"
          ? totalRow.valor
          : sumVals(
              filtered
                .filter((r) => r.data === d && r.categoria !== TOTAL_LABEL)
                .map((r) => r.valor)
            );

      return { date: d, value: total };
    });
  }, [dates, filtered]);

  // ===== Composição original mantida =====
  const stacked = useMemo(() => {
    if (!dates.length) return { data: [] as any[], keys: [] as string[] };

    const keptMods = modalities.filter((m) =>
      filtered.some((r) => r.categoria === m && (r.valor || 0) > 0)
    );

    const sortedMods = [...keptMods].sort((a, b) => {
      const sumA = filtered.filter((r) => r.categoria === a).reduce((acc, r) => acc + (r.valor || 0), 0);
      const sumB = filtered.filter((r) => r.categoria === b).reduce((acc, r) => acc + (r.valor || 0), 0);
      return sumA - sumB;
    });

    const keys = [TOTAL_LABEL, ...sortedMods];
    const byDate = new Map<string, any>();

    dates.forEach((d) => {
      if (!d) return;
      if (!byDate.has(d)) byDate.set(d, { date: d });
      const obj = byDate.get(d);
      keys.forEach((k) => { if (obj[k] == null) obj[k] = 0; });

      const rowsOnDate = filtered.filter((r) => r.data === d);
      const hasBreakdown = rowsOnDate.some((r) => r.categoria !== TOTAL_LABEL && (r.valor || 0) > 0);

      rowsOnDate.forEach((r) => {
        if (!r.categoria) return;
        if (hasBreakdown && r.categoria === TOTAL_LABEL) return;
        if (!keys.includes(r.categoria)) return;
        const v = typeof r.valor === "number" ? r.valor : 0;
        obj[r.categoria] = (obj[r.categoria] || 0) + v;
      });

      const topKey = [...keys].reverse().find((k) => (obj[k] || 0) > 0) || null;
      obj.__top = topKey;
    });

    return { data: dates.map((d) => byDate.get(d)).filter(Boolean), keys };
  }, [dates, filtered, modalities]);

  if (!filters.indicador) return null;

  return (
    <div className="space-y-4">
      <div className="chart-container animate-fade-in">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="section-title">
              {meta?.titulo || meta?.indicador_nome || "Indicador"}
            </h3>
            {loading && <div className="text-sm text-muted-foreground mt-1">Carregando dados...</div>}
            {err && <div className="text-sm text-destructive mt-1">Erro: {err}</div>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("foto")}
              className={`h-9 px-3 rounded-md border text-sm transition ${view === "foto" ? "bg-[#359ad4] text-white" : "bg-background"}`}
            >
              Fotografia atual
            </button>
            <button
              onClick={() => setView("evolucao")}
              className={`h-9 px-3 rounded-md border text-sm transition ${view === "evolucao" ? "bg-[#359ad4] text-white" : "bg-background"}`}
            >
              Evolução
            </button>
            {meta?.perfil !== "pizza" && (
              <button
                onClick={() => setView("composicao")}
                className={`h-9 px-3 rounded-md border text-sm transition ${view === "composicao" ? "bg-[#359ad4] text-white" : "bg-background"}`}
              >
                {meta?.indicador_id === "abrigos" ? "Por tipo de entidade" : "Por modalidade"}
              </button>
            )}
          </div>
        </div>

        {/* ====== Fotografia atual ====== */}
        {view === "foto" && (
          <div className="mt-4">
           <ChartRenderer
  key={`foto-${filters.indicador}`}
  perfil={
    meta?.perfil === "padrao" || meta?.tipo === "quantidade"
      ? "padrao"
      : (meta?.perfil as any)
  }
  data={fotografiaAtual?.fotoData || []}
  unidade={meta?.perfil === "barras_horizontais_percentual" ? "%" : meta?.unidade}
  formatDateBR={formatDateBR}
  showBanner={
    meta?.tipo === "quantidade" ||
    meta?.perfil === "padrao"
  }
  totalValue={fotografiaAtual?.total}
/>


            <div className="mt-3 space-y-1">
              {meta?.nota_explicativa ? (
                <div className="text-sm text-muted-foreground whitespace-pre-line">
                  {meta.nota_explicativa}
                </div>
              ) : null}
              <FonteLine fonte={meta?.fonte} url={meta?.fonte_url} />
              {lastDate ? (
                <div className="text-sm text-muted-foreground">
                  Referência: {formatDateBR(lastDate)}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* ====== Evolução original mantida ====== */}
        {view === "evolucao" && (
          <div className="mt-4">
            <div className="h-80 mt-6">
              <ChartRenderer
                perfil={meta?.perfil === "pizza" ? "barras_agrupadas" : "linha"}
                data={meta?.perfil === "pizza" ? stacked.data.map((d) => ({ ...d, name: d.date })) : lineData.map((d) => ({ name: d.date, value: d.value }))}
                keys={meta?.perfil === "pizza" ? modalities : ["value"]}
                unidade={meta?.unidade}
                formatDateBR={formatDateBR}
              />
            </div>
            <div className="mt-3 space-y-1">
  {meta?.nota_explicativa ? (
    <div className="text-sm text-muted-foreground whitespace-pre-line">
      {meta.nota_explicativa}
    </div>
  ) : null}

  <FonteLine fonte={meta?.fonte} url={meta?.fonte_url} />
</div>
          </div>
        )}

        {/* ====== Composição original mantida ====== */}
        {view === "composicao" && (
          <div className="mt-4">
            <div className="h-96 mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stacked.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickFormatter={formatDateBR} />
                  <YAxis />
                  <Tooltip content={<CompositionTooltip unidade={meta?.unidade} />} />
                  {stacked.keys.map((k, i) => (
                    <Bar key={k} dataKey={k} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} shape={<RoundedTopBar />} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
           <div className="mt-3 space-y-1">
  {meta?.nota_explicativa ? (
    <div className="text-sm text-muted-foreground whitespace-pre-line">
      {meta.nota_explicativa}
    </div>
  ) : null}

  <FonteLine fonte={meta?.fonte} url={meta?.fonte_url} />
</div>

          </div>
        )}
      </div>
    </div>
  );
}