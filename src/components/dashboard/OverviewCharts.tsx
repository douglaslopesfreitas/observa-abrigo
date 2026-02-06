import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getIndicadorSheet } from "@/services/sheetsApi";

// ✅ Paleta Rede Abrigo (primária primeiro)
const PRIMARY_COLOR = "#359AD4";
const CHART_COLORS = [
  "#359AD4",
  "#2676A0",
  "#175070",
  "#0A2E43",
  "#02121E",
  "#72C0F8",
  "#C9E3FC",
  "#FFCE19",
  "#FFB114",
  "#FA841E",
  "#E67310",
  "#9F5125",
  "#F7EFBA",
  "#FFE045",
];

// ✅ total fixo usado APENAS no cálculo (%), não aparece na UI
const NEEDS_TOTAL = 129;

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

function isFonteRedeAbrigo(fonte: unknown) {
  const f = normTxt(fonte);
  if (!f) return false;
  return f.includes("instituto rede abrigo") || f.includes("rede abrigo");
}

// ✅ se a coluna fonte não existir OU vier vazia, não filtra
function shouldKeepByFonte(fonte: unknown, hasFonteColumn: boolean) {
  if (!hasFonteColumn) return true;
  const fRaw = String(fonte ?? "").trim();
  if (!fRaw) return true;
  return isFonteRedeAbrigo(fRaw);
}

function formatDateBR(input: unknown) {
  const s = String(input ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  }
  return s;
}

function getYear(input: unknown) {
  const s = String(input ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.slice(0, 4);
  if (/^\d{4}$/.test(s)) return s;
  const m = s.match(/\b\d{4}\b/);
  return m ? m[0] : s;
}

type RowParsed = {
  territorio: string;
  data: string;
  categoria: string;
  valor: number | null;
  fonte?: string;
};

function detectCategoryFallback(headersNorm: string[]) {
  const blocked = new Set(["territorio", "data", "valor", "fonte"]);
  for (let i = 0; i < headersNorm.length; i++) {
    const h = headersNorm[i];
    if (!h) continue;
    if (blocked.has(h)) continue;
    return i;
  }
  return -1;
}

function computeTotalForDate(rows: RowParsed[], date: string): number {
  const totalRow = rows.find((r) => {
    const c = normTxt(r.categoria);
    return r.data === date && (c.includes("todos") || c.includes("em todos") || c === "total");
  });
  if (totalRow && typeof totalRow.valor === "number") return totalRow.valor;

  return rows
    .filter((r) => r.data === date && r.categoria && !normTxt(r.categoria).includes("todos"))
    .reduce((acc, r) => acc + (typeof r.valor === "number" ? r.valor : 0), 0);
}

export function OverviewCharts() {
  const [evolutionData, setEvolutionData] = useState<Array<{ name: string; value: number }>>([]);
  const [ageData, setAgeData] = useState<Array<{ name: string; value: number }>>([]);
  const [racaData, setRacaData] = useState<Array<{ name: string; value: number }>>([]);
  const [needsData, setNeedsData] = useState<Array<{ name: string; value: number }>>([]);

  // ===== Evolução do acolhimento (aba acolhidos) =====
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

        let idxCat = headersNorm.indexOf("categoria");
        if (idxCat < 0) idxCat = headersNorm.indexOf("modalidade");
        if (idxCat < 0) idxCat = detectCategoryFallback(headersNorm);

        const idxFonte = headersNorm.indexOf("fonte");
        const hasFonteColumn = idxFonte >= 0;

        if (idxTerr < 0 || idxData < 0 || idxVal < 0 || idxCat < 0) {
          setEvolutionData([]);
          return;
        }

        let lastDateAny = "";
        const parsed: RowParsed[] = body.map((r) => {
          const rawDate = String(r[idxData] ?? "").trim();
          if (rawDate) lastDateAny = rawDate;

          return {
            territorio: String(r[idxTerr] ?? "").trim(),
            data: rawDate || lastDateAny,
            categoria: String(r[idxCat] ?? "").trim(),
            valor: parseNumberOrNull(r[idxVal]),
            fonte: hasFonteColumn ? String(r[idxFonte] ?? "").trim() : "",
          };
        });

        const rj = parsed.filter((x) => isRJ(x.territorio));
        const dates = Array.from(new Set(rj.map((x) => x.data).filter(Boolean))).sort();

        const series = dates
          .map((dt) => ({ name: dt, value: computeTotalForDate(rj, dt) }))
          .filter((p) => Number.isFinite(p.value));

        setEvolutionData(series);
      })
      .catch(() => setEvolutionData([]));
  }, []);

  // ===== Faixa etária (aba faixa-etaria) em PERCENTUAL =====
  useEffect(() => {
    getIndicadorSheet("faixa-etaria")
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
        const idxFonte = headersNorm.indexOf("fonte");
        const hasFonteColumn = idxFonte >= 0;

        let idxCat = headersNorm.indexOf("categoria");
        if (idxCat < 0) idxCat = headersNorm.indexOf("faixa_etaria");
        if (idxCat < 0) idxCat = headersNorm.indexOf("faixa etaria");
        if (idxCat < 0) idxCat = headersNorm.indexOf("faixa_etária");
        if (idxCat < 0) idxCat = headersNorm.indexOf("faixa etária");
        if (idxCat < 0) idxCat = headersNorm.indexOf("idade");
        if (idxCat < 0) idxCat = detectCategoryFallback(headersNorm);

        if (idxTerr < 0 || idxData < 0 || idxVal < 0 || idxCat < 0) {
          setAgeData([]);
          return;
        }

        let lastDateAny = "";
        const parsed: RowParsed[] = body.map((r) => {
          const rawDate = String(r[idxData] ?? "").trim();
          if (rawDate) lastDateAny = rawDate;

          return {
            territorio: String(r[idxTerr] ?? "").trim(),
            data: rawDate || lastDateAny,
            categoria: String(r[idxCat] ?? "").trim(),
            valor: parseNumberOrNull(r[idxVal]),
            fonte: hasFonteColumn ? String(r[idxFonte] ?? "").trim() : "",
          };
        });

        const filtered = parsed
          .filter((x) => isRJ(x.territorio))
          .filter((x) => shouldKeepByFonte(x.fonte, hasFonteColumn));

        const dates = Array.from(new Set(filtered.map((x) => x.data).filter(Boolean))).sort();
        const last = dates[dates.length - 1];
        if (!last) {
          setAgeData([]);
          return;
        }

        const rowsLast = filtered
          .filter((r) => r.data === last)
          .filter((r) => r.categoria && typeof r.valor === "number" && (r.valor as number) > 0);

        const total = rowsLast.reduce((acc, r) => acc + (typeof r.valor === "number" ? r.valor : 0), 0);
        if (!total || total <= 0) {
          setAgeData([]);
          return;
        }

        const mapped = rowsLast
          .map((r) => ({
            name: r.categoria,
            value: ((r.valor as number) / total) * 100,
          }))
          .sort((a, b) => b.value - a.value);

        setAgeData(mapped);
      })
      .catch(() => setAgeData([]));
  }, []);

  // ===== Recorte racial (aba raça) - ✅ CORRIGIDO NOME E CÁLCULO % =====
  useEffect(() => {
    getIndicadorSheet("raça")
      .then((d) => {
        const values: any[][] = d.values || [];
        if (values.length < 2) {
          setRacaData([]);
          return;
        }

        const headersNorm = (values[0] || []).map((h) => normTxt(h));
        const body = values.slice(1);

        const idxTerr = headersNorm.indexOf("territorio");
        const idxData = headersNorm.indexOf("data");
        const idxVal = headersNorm.indexOf("valor");
        const idxFonte = headersNorm.indexOf("fonte");
        const hasFonteColumn = idxFonte >= 0;

        let idxCat = headersNorm.indexOf("raca");
        if (idxCat < 0) idxCat = headersNorm.indexOf("raça");
        if (idxCat < 0) idxCat = detectCategoryFallback(headersNorm);

        if (idxTerr < 0 || idxData < 0 || idxVal < 0 || idxCat < 0) {
          setRacaData([]);
          return;
        }

        let lastDateAny = "";
        const parsed: RowParsed[] = body.map((r) => {
          const rawDate = String(r[idxData] ?? "").trim();
          if (rawDate) lastDateAny = rawDate;

          return {
            territorio: String(r[idxTerr] ?? "").trim(),
            data: rawDate || lastDateAny,
            categoria: String(r[idxCat] ?? "").trim(),
            valor: parseNumberOrNull(r[idxVal]),
            fonte: hasFonteColumn ? String(r[idxFonte] ?? "").trim() : "",
          };
        });

        const filtered = parsed
          .filter((x) => isRJ(x.territorio))
          .filter((x) => shouldKeepByFonte(x.fonte, hasFonteColumn));

        const dates = Array.from(new Set(filtered.map((x) => x.data).filter(Boolean))).sort();
        const last = dates[dates.length - 1];
        if (!last) {
          setRacaData([]);
          return;
        }

        const rowsLast = filtered.filter((r) => r.data === last && r.categoria && typeof r.valor === "number");
        
        // Calcula o total para extrair a porcentagem
        const totalRaca = rowsLast.reduce((acc, r) => acc + (r.valor || 0), 0);

        const mapped = rowsLast
          .map((r) => ({ 
            name: r.categoria, 
            value: totalRaca > 0 ? ((r.valor || 0) / totalRaca) * 100 : 0 
          }))
          .sort((a, b) => b.value - a.value);

        setRacaData(mapped);
      })
      .catch(() => setRacaData([]));
  }, []);

  // ===== Maiores Necessidades (aba doacao) em PERCENTUAL =====
  useEffect(() => {
    getIndicadorSheet("doacao")
      .then((d) => {
        const values: any[][] = d.values || [];
        if (values.length < 2) {
          setNeedsData([]);
          return;
        }

        const headersNorm = (values[0] || []).map((h) => normTxt(h));
        const body = values.slice(1);

        const idxTerr = headersNorm.indexOf("territorio");
        const idxData = headersNorm.indexOf("data");
        const idxVal = headersNorm.indexOf("valor");
        const idxFonte = headersNorm.indexOf("fonte");
        const hasFonteColumn = idxFonte >= 0;

        let idxCat = headersNorm.indexOf("categoria");
        if (idxCat < 0) idxCat = headersNorm.indexOf("necessidade");
        if (idxCat < 0) idxCat = detectCategoryFallback(headersNorm);

        if (idxTerr < 0 || idxData < 0 || idxVal < 0 || idxCat < 0) {
          setNeedsData([]);
          return;
        }

        let lastDateAny = "";
        const parsed: RowParsed[] = body.map((r) => {
          const rawDate = String(r[idxData] ?? "").trim();
          if (rawDate) lastDateAny = rawDate;

          return {
            territorio: String(r[idxTerr] ?? "").trim(),
            data: rawDate || lastDateAny,
            categoria: String(r[idxCat] ?? "").trim(),
            valor: parseNumberOrNull(r[idxVal]),
            fonte: hasFonteColumn ? String(r[idxFonte] ?? "").trim() : "",
          };
        });

        const filtered = parsed
          .filter((x) => isRJ(x.territorio))
          .filter((x) => shouldKeepByFonte(x.fonte, hasFonteColumn));

        const dates = Array.from(new Set(filtered.map((x) => x.data).filter(Boolean))).sort();
        const last = dates[dates.length - 1];
        if (!last) {
          setNeedsData([]);
          return;
        }

        const rowsLast = filtered
          .filter((r) => r.data === last)
          .filter((r) => r.categoria && typeof r.valor === "number" && r.valor > 0);

        const mapped = rowsLast
          .map((r) => ({
            name: r.categoria,
            value: ((r.valor as number) / NEEDS_TOTAL) * 100,
          }))
          .filter((x) => Number.isFinite(x.value) && x.value > 0)
          .sort((a, b) => b.value - a.value);

        setNeedsData(mapped);
      })
      .catch(() => setNeedsData([]));
  }, []);

  const evolutionTickFormatter = useMemo(() => {
    return (v: any) => getYear(v);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Evolução */}
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
                  tickFormatter={evolutionTickFormatter}
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
                  }}
                  labelFormatter={(label) => `Referência: ${formatDateBR(label)}`}
                  formatter={(value: number) => [value.toLocaleString("pt-BR"), "Acolhidos"]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={PRIMARY_COLOR}
                  strokeWidth={2}
                  dot={{ fill: PRIMARY_COLOR, strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Faixa etária */}
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
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  width={130}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`${value.toFixed(1).replace(".", ",")}%`, "Percentual"]}
                />
                <Bar dataKey="value" fill={PRIMARY_COLOR} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recorte Racial (DONUT) ✅ */}
      {racaData.length === 0 ? (
        <EmptyState title="Recorte Racial" />
      ) : (
        <div className="chart-container animate-fade-in" style={{ animationDelay: "400ms" }}>
          <h3 className="section-title">Recorte Racial</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={racaData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60} // ✅ Cria o formato Donut
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  isAnimationActive={true} // ✅ Animação de entrada
                  animationDuration={1000}
                  label={({ name, value }) => `${name}: ${value.toFixed(1).replace(".", ",")}%`} // ✅ Categoria: Valor% ao lado
                >
                  {racaData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                {/* Tooltip e Legenda removidos conforme solicitado */}
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Maiores Necessidades */}
      {needsData.length === 0 ? (
        <EmptyState title="Maiores Necessidades" />
      ) : (
        <div className="chart-container animate-fade-in" style={{ animationDelay: "500ms" }}>
          <h3 className="section-title">Maiores Necessidades</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={needsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  width={200}
                  interval={0}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`${value.toFixed(1).replace(".", ",")}%`, "Percentual"]}
                />
                <Bar dataKey="value" fill={PRIMARY_COLOR} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}