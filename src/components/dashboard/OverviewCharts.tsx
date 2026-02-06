import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { mockDataRecords } from "@/data/mockData";
import { getIndicadorSheet } from "@/services/sheetsApi";

const CHART_COLORS = [
  "hsl(215, 70%, 50%)",
  "hsl(180, 50%, 50%)",
  "hsl(35, 85%, 55%)",
  "hsl(280, 45%, 55%)",
  "hsl(150, 50%, 45%)",
  "hsl(340, 60%, 55%)",
];

function EmptyState({ title }: { title: string }) {
  return (
    <div className="chart-container">
      <h3 className="section-title">{title}</h3>
      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
        Sem dados disponíveis ainda
      </div>
    </div>
  );
}

function parseNumberOrNull(v: unknown): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const cleaned = s.replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normTxt(s: unknown) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isRJ(territorio: string) {
  const t = normTxt(territorio);
  return t === "rj" || t.includes("rio de janeiro");
}

type RowBase = {
  territorio: string;
  data: string;
  categoria: string;
  valor: number | null;
};

function computeTotalForDate(rows: RowBase[], date: string): number {
  // aceita variações comuns de linha total
  const totalRow = rows.find((r) => {
    const c = normTxt(r.categoria);
    return r.data === date && (c.includes("todos") || c.includes("em todos"));
  });

  if (totalRow && typeof totalRow.valor === "number") return totalRow.valor;

  return rows
    .filter((r) => r.data === date && r.categoria && !normTxt(r.categoria).includes("todos"))
    .reduce((acc, r) => acc + (typeof r.valor === "number" ? r.valor : 0), 0);
}

export function OverviewCharts() {
  // ====== NOVO: EVOLUÇÃO (acolhidos) ======
  const [evolutionData, setEvolutionData] = useState<Array<{ name: string; value: number }>>([]);

  // ====== NOVO: FAIXA ETÁRIA (seu indicador) ======
  const [ageData, setAgeData] = useState<Array<{ name: string; value: number }>>([]);

  // Mantém mock para os outros dois
  const stateData = useMemo(() => {
    return mockDataRecords
      .filter((r) => r.indicador_id === "total_unidades" && r.territorio_tipo === "uf")
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5)
      .map((r) => ({ name: r.territorio_nome, value: r.valor }));
  }, []);

  const typeData = useMemo(() => {
    return mockDataRecords
      .filter((r) => r.indicador_id === "tipo_unidade")
      .map((r) => ({ name: r.categoria, value: r.valor }));
  }, []);

  // ====== Carrega evolução do indicador acolhidos ======
  useEffect(() => {
    getIndicadorSheet("acolhidos")
      .then((d) => {
        const values: any[][] = d.values || [];
        if (values.length < 2) {
          setEvolutionData([]);
          return;
        }

        const headersNorm = (values[0] || []).map((h) => normTxt(h));
        const body = values.slice(1);

        const idxTerr = headersNorm.indexOf("territorio");
        const idxData = headersNorm.indexOf("data");
        const idxVal = headersNorm.indexOf("valor");

        // pode ser modalidade/categoria
        let idxCat = headersNorm.indexOf("categoria");
        if (idxCat < 0) idxCat = headersNorm.indexOf("modalidade");
        if (idxTerr < 0 || idxData < 0 || idxVal < 0 || idxCat < 0) {
          setEvolutionData([]);
          return;
        }

        let lastDateAny = "";
        const parsed: RowBase[] = body.map((r) => {
          const rawDate = String(r[idxData] ?? "").trim();
          if (rawDate) lastDateAny = rawDate;

          return {
            territorio: String(r[idxTerr] ?? "").trim(),
            data: rawDate || lastDateAny,
            categoria: String(r[idxCat] ?? "").trim(),
            valor: parseNumberOrNull(r[idxVal]),
          };
        });

        const rj = parsed.filter((x) => isRJ(x.territorio));
        const dates = Array.from(new Set(rj.map((x) => x.data).filter(Boolean))).sort();

        const series = dates.map((dt) => ({
          name: dt,
          value: computeTotalForDate(rj, dt),
        }));

        setEvolutionData(series.filter((p) => Number.isFinite(p.value)));
      })
      .catch(() => setEvolutionData([]));
  }, []);

  // ====== Carrega seu indicador de faixa etária ======
  useEffect(() => {
    getIndicadorSheet("faixa_etaria")
      .then((d) => {
        const values: any[][] = d.values || [];
        if (values.length < 2) {
          setAgeData([]);
          return;
        }

        const headersNorm = (values[0] || []).map((h) => normTxt(h));
        const body = values.slice(1);

        const idxTerr = headersNorm.indexOf("territorio");
        const idxData = headersNorm.indexOf("data");
        const idxVal = headersNorm.indexOf("valor");

        // coluna de categoria pode variar
        const candidates = ["categoria", "faixa_etaria", "faixa etaria", "idade", "faixa"];
        let idxCat = -1;
        for (const c of candidates) {
          const i = headersNorm.indexOf(normTxt(c));
          if (i >= 0) {
            idxCat = i;
            break;
          }
        }

        if (idxTerr < 0 || idxData < 0 || idxVal < 0 || idxCat < 0) {
          setAgeData([]);
          return;
        }

        let lastDateAny = "";
        const parsed: RowBase[] = body.map((r) => {
          const rawDate = String(r[idxData] ?? "").trim();
          if (rawDate) lastDateAny = rawDate;

          return {
            territorio: String(r[idxTerr] ?? "").trim(),
            data: rawDate || lastDateAny,
            categoria: String(r[idxCat] ?? "").trim(),
            valor: parseNumberOrNull(r[idxVal]),
          };
        });

        const rj = parsed.filter((x) => isRJ(x.territorio));
        const dates = Array.from(new Set(rj.map((x) => x.data).filter(Boolean))).sort();
        const last = dates[dates.length - 1];

        if (!last) {
          setAgeData([]);
          return;
        }

        const rowsLast = rj.filter((r) => r.data === last);

        const mapped = rowsLast
          .filter((r) => r.categoria && typeof r.valor === "number" && r.valor > 0)
          .map((r) => ({ name: r.categoria, value: r.valor as number }));

        setAgeData(mapped);
      })
      .catch(() => setAgeData([]));
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Evolução (AGORA: indicador acolhidos) */}
      {evolutionData.length === 0 ? (
        <EmptyState title="Evolução do Acolhimento" />
      ) : (
        <div className="chart-container animate-fade-in" style={{ animationDelay: "200ms" }}>
          <h3 className="section-title">Evolução do Acolhimento</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                  formatter={(value: number) => [value.toLocaleString("pt-BR"), "Acolhidos"]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS[0], strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Faixa etária (AGORA: seu indicador faixa_etaria) */}
      {ageData.length === 0 ? (
        <EmptyState title="Distribuição por Faixa Etária" />
      ) : (
        <div className="chart-container animate-fade-in" style={{ animationDelay: "300ms" }}>
          <h3 className="section-title">Distribuição por Faixa Etária</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [value.toLocaleString("pt-BR"), "Acolhidos"]}
                />
                <Bar dataKey="value" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top 5 estados (mock) */}
      {stateData.length === 0 ? (
        <EmptyState title="Unidades por Estado (Top 5)" />
      ) : (
        <div className="chart-container animate-fade-in" style={{ animationDelay: "400ms" }}>
          <h3 className="section-title">Unidades por Estado (Top 5)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [value.toLocaleString("pt-BR"), "Unidades"]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {stateData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tipos de unidade (mock) */}
      {typeData.length === 0 ? (
        <EmptyState title="Tipos de Unidade" />
      ) : (
        <div className="chart-container animate-fade-in" style={{ animationDelay: "500ms" }}>
          <h3 className="section-title">Tipos de Unidade</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
                >
                  {typeData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [value.toLocaleString("pt-BR"), "Unidades"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}