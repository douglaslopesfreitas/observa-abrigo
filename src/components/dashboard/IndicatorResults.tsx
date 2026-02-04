import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import type { FilterState } from "@/types/dashboard";
import { getIndicador } from "@/services/sheetsApi";

type CatalogRow = {
  area?: string;
  indicador_id?: string;
  indicador_nome?: string;
  fonte?: string;
  fonte_url?: string;
  sheet?: string;
  range?: string;
  tipo?: string;
  titulo?: string;
  unidade?: string;
  territorio_col?: string;
};

const PRIMARY_COLOR = "#359AD4";

const CHART_COLORS = [
  "#2674a0",
  "#E67310",
  "#FFCE19",
  "#FFB114",
  "#0A2E43",
  "#72C0F8",
  "#175070",
  "#C9E3FC",
  "#f7efba",
  "#9F5125",
  "#FA841E",
  "#02121E",
];

type ParsedRow = {
  territorio: string;
  data: string;
  modalidade: string;
  valor: number | null;
  fonte: string;
};

type ViewMode = "foto" | "evolucao" | "composicao";

const TOTAL_LABEL = "Em todos os acolhimentos";

// Retorna null quando a célula está vazia, para não confundir com 0
function parseNumber(v: unknown): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function normalizeHeader(h: unknown) {
  return String(h ?? "").trim().toLowerCase();
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

      {/* TOTAL */}
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

  // ✅ data de atualização (vem de _meta!B1)
  const [updatedAtBR, setUpdatedAtBR] = useState<string | null>(null);

  const meta = useMemo(() => {
    if (!filters.indicador) return null;
    return catalogo.find((c) => c.indicador_id === filters.indicador) || null;
  }, [filters.indicador, catalogo]);

  // Quando trocar o indicador, volta pra Fotografia atual
  useEffect(() => {
    if (filters.indicador) setView("foto");
  }, [filters.indicador]);

  useEffect(() => {
    async function run() {
      if (!filters.indicador || !meta?.sheet) return;

      setLoading(true);
      setErr(null);

      try {
        const range =
          meta.range && meta.range.includes("!")
            ? meta.range
            : `${meta.sheet}!${meta.range || "A:Z"}`;

        // ✅ pega indicador e meta em paralelo
        const [data, metaData] = await Promise.all([
          getIndicador(range),
          getIndicador("_meta!B1"),
        ]);

        const values: any[][] = data.values || [];

        // metaData.values deve vir tipo [[ "03/02/2026" ]]
        const metaValues: any[][] = metaData.values || [];
        const b1 = metaValues?.[0]?.[0];
        const b1Str = String(b1 ?? "").trim();
        setUpdatedAtBR(b1Str ? b1Str : null);

        if (values.length < 2) {
          setRows([]);
          return;
        }

        const headers = values[0].map(normalizeHeader);
        const body = values.slice(1);

        const idxTerr = headers.indexOf("territorio");
        const idxData = headers.indexOf("data");
        const idxMod = headers.indexOf("modalidade");
        const idxVal = headers.indexOf("valor");
        const idxFonte = headers.indexOf("fonte");

        let lastDate = "";
        const parsed: ParsedRow[] = body.map((r) => {
          const rawDate = String(r[idxData] ?? "").trim();
          if (rawDate) lastDate = rawDate;

          return {
            territorio: String(r[idxTerr] ?? "").trim(),
            data: rawDate || lastDate, // corrige datas mescladas
            modalidade: String(r[idxMod] ?? "").trim(),
            valor: parseNumber(r[idxVal]),
            fonte: String(r[idxFonte] ?? "").trim(),
          };
        });

        setRows(parsed);
      } catch (e: any) {
        setRows([]);
        setUpdatedAtBR(null);
        setErr(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    }

    run();
  }, [filters.indicador, meta?.sheet, meta?.range]);

  const territorioSel = filters.territorio || "RJ";

  const filtered = useMemo(() => {
    const base = rows.filter((r) => r.territorio === territorioSel);
    if (filters.fonte) return base.filter((r) => r.fonte === filters.fonte);
    return base;
  }, [rows, territorioSel, filters.fonte]);

  const dates = useMemo(() => {
    const ds = Array.from(new Set(filtered.map((r) => r.data).filter(Boolean)));
    ds.sort(); // iso ordena certo
    return ds;
  }, [filtered]);

  const lastDate = dates[dates.length - 1] || "";

  // Modalidades (exceto a linha "Em todos os acolhimentos")
  const modalities = useMemo(() => {
    const set = new Set<string>();
    filtered.forEach((r) => {
      if (r.modalidade && r.modalidade !== TOTAL_LABEL) set.add(r.modalidade);
    });
    return Array.from(set);
  }, [filtered]);

  // ===== Fotografia atual =====
  const fotografiaAtual = useMemo(() => {
    if (!lastDate) return null;

    const totalRow = filtered.find(
      (r) => r.data === lastDate && r.modalidade === TOTAL_LABEL
    );

    const total =
      totalRow && typeof totalRow.valor === "number"
        ? totalRow.valor
        : sumVals(
            filtered
              .filter(
                (r) =>
                  r.data === lastDate &&
                  r.modalidade &&
                  r.modalidade !== TOTAL_LABEL
              )
              .map((r) => r.valor)
          );

    const byMod = new Map<string, number>();
    filtered
      .filter(
        (r) =>
          r.data === lastDate && r.modalidade && r.modalidade !== TOTAL_LABEL
      )
      .forEach((r) => {
        const v = typeof r.valor === "number" ? r.valor : 0;
        byMod.set(r.modalidade, (byMod.get(r.modalidade) || 0) + v);
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
        (r) => r.data === d && r.modalidade === TOTAL_LABEL
      );

      const total =
        totalRow && typeof totalRow.valor === "number"
          ? totalRow.valor
          : sumVals(
              filtered
                .filter((r) => r.data === d && r.modalidade !== TOTAL_LABEL)
                .map((r) => r.valor)
            );

      return { date: d, value: total };
    });
  }, [dates, filtered]);

  // ===== Composição =====
  const stacked = useMemo(() => {
    if (!dates.length) return { data: [] as any[], keys: [] as string[] };

    const keptMods = modalities.filter((m) =>
      filtered.some((r) => r.modalidade === m && (r.valor || 0) > 0)
    );

    const sortedMods = [...keptMods].sort((a, b) => {
      const sumA = filtered
        .filter((r) => r.modalidade === a)
        .reduce((acc, r) => acc + (r.valor || 0), 0);

      const sumB = filtered
        .filter((r) => r.modalidade === b)
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
        (r) =>
          r.modalidade &&
          r.modalidade !== TOTAL_LABEL &&
          typeof r.valor === "number" &&
          r.valor > 0
      );

      rowsOnDate.forEach((r) => {
        if (!r.modalidade) return;
        if (hasBreakdown && r.modalidade === TOTAL_LABEL) return;
        if (!keys.includes(r.modalidade)) return;

        const v = typeof r.valor === "number" ? r.valor : 0;
        obj[r.modalidade] = (obj[r.modalidade] || 0) + v;
      });

      const topKey =
        [...keys].reverse().find((k) => (obj[k] || 0) > 0) || null;
      obj.__top = topKey;
    });

    const data = dates.map((d) => byDate.get(d)).filter(Boolean);

    return { data, keys };
  }, [dates, filtered, modalities]);

  if (!filters.indicador) return null;

  return (
    <div className="space-y-4">
      <div className="chart-container animate-fade-in">
        {/* Header + botões */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="section-title">
              {meta?.titulo || meta?.indicador_nome || "Indicador"}
            </h3>

            {loading ? (
              <div className="text-sm text-muted-foreground mt-1">
                Carregando dados...
              </div>
            ) : null}

            {err ? (
              <div className="text-sm text-destructive mt-1">
                Erro ao carregar indicador: {err}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setView("foto")}
              className={`h-9 px-3 rounded-md border text-sm transition ${
                view === "foto"
                  ? "bg-[#359ad4] text-white border-[#359ad4]"
                  : "bg-background text-foreground border-border hover:bg-muted"
              }`}
            >
              Fotografia atual
            </button>

            <button
              type="button"
              onClick={() => setView("evolucao")}
              className={`h-9 px-3 rounded-md border text-sm transition ${
                view === "evolucao"
                  ? "bg-[#359ad4] text-white border-[#359ad4]"
                  : "bg-background text-foreground border-border hover:bg-muted"
              }`}
            >
              Evolução
            </button>

            <button
              type="button"
              onClick={() => setView("composicao")}
              className={`h-9 px-3 rounded-md border text-sm transition ${
                view === "composicao"
                  ? "bg-[#359ad4] text-white border-[#359ad4]"
                  : "bg-background text-foreground border-border hover:bg-muted"
              }`}
            >
              Por modalidade de acolhimento
            </button>
          </div>
        </div>

        {/* ====== Fotografia atual ====== */}
        {view === "foto" && (
          <>
            <div className="mt-4 rounded-xl border bg-background p-4">
              <div className="mt-2 text-4xl font-semibold tracking-tight text-foreground">
                {typeof fotografiaAtual?.total === "number"
                  ? fotografiaAtual.total.toLocaleString("pt-BR")
                  : "-"}
              </div>

              {meta?.unidade ? (
                <div className="text-sm text-muted-foreground mt-1">
                  {meta.unidade}
                </div>
              ) : null}
            </div>

            <div className="h-80 mt-6">
              {!fotografiaAtual?.fotoData || fotografiaAtual.fotoData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Sem dados de modalidades para exibir na fotografia atual
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fotografiaAtual.fotoData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", dy:10 }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      interval={0}
                      angle={0}
                      textAnchor="middle"
                      height={60}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                      }}
                      formatter={(value: number) => [
                        Number(value).toLocaleString("pt-BR"),
                        meta?.unidade || "valor",
                      ]}
                    />
                    <Bar dataKey="value" fill={PRIMARY_COLOR} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </>
        )}

        {/* ====== Evolução ====== */}
        {view === "evolucao" && (
          <div className="h-80 mt-6">
            {lineData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Sem dados para exibir
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickFormatter={(v) => formatDateBR(String(v))}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                    labelFormatter={(l) => formatDateBR(String(l))}
                    formatter={(value: number) => [
                      Number(value).toLocaleString("pt-BR"),
                      meta?.unidade || "valor",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={PRIMARY_COLOR}
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS[0], strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* ====== Composição ====== */}
        {view === "composicao" && (
          <div className="h-96 mt-6">
            {stacked.data.length === 0 || stacked.keys.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Sem dados de modalidades para empilhar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stacked.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickFormatter={(v) => formatDateBR(String(v))}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <Tooltip content={<CompositionTooltip unidade={meta?.unidade} />} />

                  {stacked.keys.map((k, i) => (
                    <Bar
                      key={k}
                      dataKey={k}
                      stackId="a"
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      isAnimationActive={false}
                      shape={(props: any) => {
                        const { x, y, width, height, fill, payload } = props;
                        if (!width || !height || height <= 0) return null;

                        const isTop = payload?.__top === k;
                        const R = 8;
                        const r = isTop ? Math.min(R, width / 2, height / 2) : 0;

                        if (!r) {
                          return <rect x={x} y={y} width={width} height={height} fill={fill} />;
                        }

                        const d = `
                          M ${x} ${y + r}
                          Q ${x} ${y} ${x + r} ${y}
                          L ${x + width - r} ${y}
                          Q ${x + width} ${y} ${x + width} ${y + r}
                          L ${x + width} ${y + height}
                          L ${x} ${y + height}
                          Z
                        `;
                        return <path d={d} fill={fill} />;
                      }}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

{/* Fonte / Referência */}
{view === "foto" ? (
  <div className="mt-4 text-xs text-muted-foreground space-y-1">
    <div>
      Fonte:{" "}
      {meta?.fonte_url ? (
        <a
          href={meta.fonte_url}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          {meta?.fonte || "Fonte"}
        </a>
      ) : (
        <span>{meta?.fonte || "Fonte"}</span>
      )}
    </div>

    <div>
      Referência:{" "}
      <span>{fotografiaAtual?.data ? formatDateBR(fotografiaAtual.data) : "-"}</span>
    </div>
  </div>
) : (
  <div className="mt-4 text-xs text-muted-foreground">
    Fonte:{" "}
    {meta?.fonte_url ? (
      <a
        href={meta.fonte_url}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2"
      >
        {meta?.fonte || "Fonte"}
      </a>
    ) : (
      <span>{meta?.fonte || "Fonte"}</span>
    )}
  </div>
)}