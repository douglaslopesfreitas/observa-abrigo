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

const PRIMARY_COLOR = "#359AD4";

// ✅ Mesmas cores originais, apenas reorganizadas para melhor contraste
const CHART_COLORS = [
  "#2674a0", // Azul
  "#FA841E", // Laranja
  "#72C0F8", // Azul Claro
  "#FFCE19", // Amarelo
  "#0A2E43", // Navy
  "#E67310", // Laranja Escuro
  "#C9E3FC", // Azul Pálido
  "#FFB114", // Amarelo Ouro
  "#175070", // Azul Profundo
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

// Retorna null quando a célula está vazia, para não confundir com 0
function parseNumber(v: unknown): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Normaliza cabeçalhos para comparação robusta (acentos, espaços, etc.)
function normalizeHeader(h: any): string {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/\s+/g, "_") // espaços viram _
    .replace(/[^\w]/g, "_") // resto vira _
    .replace(/_+/g, "_") // colapsa __
    .replace(/^_+|_+$/g, ""); // remove _ no começo/fim
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

// ✅ Fonte (clicável se tiver URL)
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

// Tooltip customizado para esconder linhas com valor 0
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
              justifyContent: "space-between",
              gap: 12,
              fontSize: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: r.color,
                  display: "inline-block",
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
          marginTop: 10,
          paddingTop: 8,
          borderTop: "1px solid hsl(var(--border))",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          fontWeight: 600,
          color: "hsl(var(--foreground))",
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
  catalogo: CatalogRow[];
}) {
  const [view, setView] = useState<ViewMode>("foto");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);

  // ✅ data de atualização (vem de _meta!B1) - mantido para futuro uso
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

  // Quando trocar o indicador, volta pra Fotografia atual
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

        // ✅ categoria: tenta "categoria"; se não existir, tenta variações; se ainda não, pega a 1ª coluna "desconhecida"
        let idxCat = headers.indexOf("categoria");
        if (idxCat < 0) {
          const candidatos = [
            "modalidade",
            "faixa",
            "raca",
            "raca_",
            "alfabetizacao",
            "atendimento_psicologico",
            "atendimento_psicológico",
            "atendimento_psicologico_",
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

        // ✅ obrigatórias mínimas: territorio, data, valor
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

  // ===== Fotografia atual =====
  const fotografiaAtual = useMemo(() => {
    if (!lastDate) return null;

    const totalRow = filtered.find(
      (r) => r.data === lastDate && r.categoria === TOTAL_LABEL
    );

    const total =
      totalRow && typeof totalRow.valor === "number"
        ? totalRow.valor
        : sumVals(
            filtered
              .filter(
                (r) =>
                  r.data === lastDate &&
                  r.categoria &&
                  r.categoria !== TOTAL_LABEL
              )
              .map((r) => r.valor)
          );

    const byMod = new Map<string, number>();
    filtered
      .filter(
        (r) => r.data === lastDate && r.categoria && r.categoria !== TOTAL_LABEL
      )
      .forEach((r) => {
        const v = typeof r.valor === "number" ? r.valor : 0;
        byMod.set(r.categoria, (byMod.get(r.categoria) || 0) + v);
      });

    const fotoData = Array.from(byMod.entries())
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      data: lastDate,
      total,
      fotoData,
    };
  }, [filtered, lastDate]);

  // ===== Evolução =====
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

  // ===== Composição =====
  const stacked = useMemo(() => {
    if (!dates.length) return { data: [] as any[], keys: [] as string[] };

    const keptMods = modalities.filter((m) =>
      filtered.some((r) => r.categoria === m && (r.valor || 0) > 0)
    );

    const sortedMods = [...keptMods].sort((a, b) => {
      const sumA = filtered
        .filter((r) => r.categoria === a)
        .reduce((acc, r) => acc + (r.valor || 0), 0);
      const sumB = filtered
        .filter((r) => r.categoria === b)
        .reduce((acc, r) => acc + (r.valor || 0), 0);
      return sumA - sumB;
    });

    const keys = [TOTAL_LABEL, ...sortedMods];
    const byDate = new Map<string, any>();

    dates.forEach((d) => {
      if (!d) return;
      if (!byDate.has(d)) byDate.set(d, { date: d });
      const obj = byDate.get(d);

      keys.forEach((k) => {
        if (obj[k] == null) obj[k] = 0;
      });

      const rowsOnDate = filtered.filter((r) => r.data === d);
      const hasBreakdown = rowsOnDate.some(
        (r) => r.categoria && r.categoria !== TOTAL_LABEL && (r.valor || 0) > 0
      );

      rowsOnDate.forEach((r) => {
        if (!r.categoria) return;
        if (hasBreakdown && r.categoria === TOTAL_LABEL) return;
        if (!keys.includes(r.categoria)) return;
        const v = typeof r.valor === "number" ? r.valor : 0;
        obj[r.categoria] = (obj[r.categoria] || 0) + v;
      });

      const topKey =
        [...keys].reverse().find((k) => (obj[k] || 0) > 0) || null;
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
            {loading && (
              <div className="text-sm text-muted-foreground mt-1">
                Carregando dados...
              </div>
            )}
            {err && <div className="text-sm text-destructive mt-1">Erro: {err}</div>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("foto")}
              className={`h-9 px-3 rounded-md border text-sm transition ${
                view === "foto" ? "bg-[#359ad4] text-white" : "bg-background"
              }`}
            >
              Fotografia atual
            </button>
            <button
              onClick={() => setView("evolucao")}
              className={`h-9 px-3 rounded-md border text-sm transition ${
                view === "evolucao" ? "bg-[#359ad4] text-white" : "bg-background"
              }`}
            >
              Evolução
            </button>

            {meta?.perfil !== "pizza" && (
              <button
                onClick={() => setView("composicao")}
                className={`h-9 px-3 rounded-md border text-sm transition ${
                  view === "composicao" ? "bg-[#359ad4] text-white" : "bg-background"
                }`}
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
              perfil={meta?.perfil || "padrao"}
              data={fotografiaAtual?.fotoData || []}
              unidade={meta?.unidade}
              formatDateBR={formatDateBR}
              showBanner={meta?.perfil === "padrao"}
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

        {/* ====== Evolução ====== */}
        {view === "evolucao" && (
          <div className="mt-4">
            <div className="h-80 mt-6">
              {lineData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Sem dados para exibir na evolução
                </div>
              ) : (
                <ChartRenderer
                  key={`evol-${filters.indicador}`}
                  perfil={meta?.perfil === "pizza" ? "barras_agrupadas" : "linha"}
                  data={
                    meta?.perfil === "pizza"
                      ? stacked.data.map((d) => ({ ...d, name: d.date }))
                      : lineData.map((d) => ({ name: d.date, value: d.value }))
                  }
                  keys={meta?.perfil === "pizza" ? modalities : ["value"]}
                  unidade={meta?.unidade}
                  formatDateBR={formatDateBR}
                />
              )}
            </div>
            <div className="mt-3">
              <FonteLine fonte={meta?.fonte} url={meta?.fonte_url} />
            </div>
          </div>
        )}

        {/* ====== Composição ====== */}
        {view === "composicao" && (
          <div className="mt-4">
            <div className="h-96 mt-6">
              {stacked.data.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Sem dados detalhados
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart key={`comp-${filters.indicador}`} data={stacked.data}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={formatDateBR}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CompositionTooltip unidade={meta?.unidade} />} />
                    {stacked.keys.map((k, i) => (
                      <Bar
                        key={k}
                        dataKey={k}
                        stackId="a"
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                        radius={[4, 4, 0, 0]} // ✅ Barras arredondadas no topo
                        isAnimationActive={true}
                        animationDuration={1500}
                        animationBegin={100}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-3">
              <FonteLine fonte={meta?.fonte} url={meta?.fonte_url} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}