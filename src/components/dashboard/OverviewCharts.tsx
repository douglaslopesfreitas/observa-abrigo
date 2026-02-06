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

function isFonteRedeAbrigo(fonte: unknown) {
  // Você pediu “fonte da Rede Abrigo”. Aqui eu filtro pelo texto do print:
  // "ALIA | Instituto Rede Abrigo"
  const f = normTxt(fonte);
  if (!f) return false;
  return f.includes("instituto rede abrigo") || f.includes("rede abrigo");
}

function formatDateBR(input: unknown) {
  const s = String(input ?? "").trim();
  if (!s) return "";
  // aceita YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  }
  return s; // se vier só "2025", mantém "2025"
}

function getYear(input: unknown) {
  const s = String(input ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.slice(0, 4);
  if (/^\d{4}$/.test(s)) return s;
  // fallback: tenta achar 4 dígitos
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

function detectCategoryIndex(headersNorm: string[], candidates: string[]) {
  for (const c of candidates) {
    const i = headersNorm.indexOf(normTxt(c));
    if (i >= 0) return i;
  }
  return -1;
}

function computeTotalForDate(rows: RowParsed[], date: string): number {
  // tenta achar linha de total
  const totalRow = rows.find((r) => {
    const c = normTxt(r.categoria);
    return r.data === date && (c.includes("todos") || c.includes("em todos") || c === "total");
  });
  if (totalRow && typeof totalRow.valor === "number") return totalRow.valor;

  // senão soma tudo menos totais
  return rows
    .filter((r) => r.data === date && r.categoria && !normTxt(r.categoria).includes("todos"))
    .reduce((acc, r) => acc + (typeof r.valor === "number" ? r.valor : 0), 0);
}

export function OverviewCharts() {
  // 1) Evolução (acolhidos)
  const [evolutionData, setEvolutionData] = useState<Array<{ name: string; value: number }>>([]);

  // 2) Faixa etária (faixa-etaria)
  const [ageData, setAgeData] = useState<Array<{ name: string; value: number }>>([]);

  // 3) Raça (raca)
  const [racaData, setRacaData] = useState<Array<{ name: string; value: number }>>([]);

  // 4) Doações / maiores necessidades (doacao)
  const [needsData, setNeedsData] = useState<Array<{ name: string; value: number }>>([]);

  // ====== Evolução do acolhimento (puxa da aba acolhidos) ======
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

        // fonte é opcional aqui (muita aba de acolhidos não tem)
        const idxFonte = headersNorm.indexOf("fonte");

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
            fonte: idxFonte >= 0 ? String(r[idxFonte] ?? "").trim() : "",
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

  // ====== Faixa etária (puxa da aba faixa-etaria, filtra fonte Rede Abrigo) ======
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

        // tenta achar a coluna de faixa
        const idxCat = detectCategoryIndex(headersNorm, [
          "categoria",
          "faixa_etaria",
          "faixa etaria",
          "faixa_etária",
          "faixa etária",
          "idade",
          "faixa",
        ]);

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
            fonte: idxFonte >= 0 ? String(r[idxFonte] ?? "").trim() : "",
          };
        });

        const filtered = parsed
          .filter((x) => isRJ(x.territorio))
          .filter((x) => (idxFonte >= 0 ? isFonteRedeAbrigo(x.fonte) : true));

        const dates = Array.from(new Set(filtered.map((x) => x.data).filter(Boolean))).sort();
        const last = dates[dates.length - 1];

        if (!last) {
          setAgeData([]);
          return;
        }

        const rowsLast = filtered.filter((r) => r.data === last);

        const mapped = rowsLast
          .filter((r) => r.categoria && typeof r.valor === "number" && r.valor > 0)
          .map((r) => ({ name: r.categoria, value: r.valor as number }));

        setAgeData(mapped);
      })
      .catch(() => setAgeData([]));
  }, []);

  // ====== Raça (puxa da aba raca, filtra fonte Rede Abrigo) ======
  useEffect(() => {
    getIndicadorSheet("raca")
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

        // na sua planilha a coluna é "raça" (vira "raca" na normalização)
        const idxCat = detectCategoryIndex(headersNorm, ["raca", "raça", "categoria"]);

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
            fonte: idxFonte >= 0 ? String(r[idxFonte] ?? "").trim() : "",
          };
        });

        const filtered = parsed
          .filter((x) => isRJ(x.territorio))
          .filter((x) => (idxFonte >= 0 ? isFonteRedeAbrigo(x.fonte) : true));

        const dates = Array.from(new Set(filtered.map((x) => x.data).filter(Boolean))).sort();
        const last = dates[dates.length - 1];

        if (!last) {
          setRacaData([]);
          return;
        }

        const rowsLast = filtered.filter((r) => r.data === last);

        const mapped = rowsLast
          .filter((r) => r.categoria && typeof r.valor === "number" && r.valor > 0)
          .map((r) => ({ name: r.categoria, value: r.valor as number }))
          .sort((a, b) => b.value - a.value);

        setRacaData(mapped);
      })
      .catch(() => setRacaData([]));
  }, []);

  // ====== Doações / maiores necessidades (puxa da aba doacao, filtra fonte Rede Abrigo) ======
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

        // tenta achar “categoria”/“necessidade”/“doacao”
        const idxCat = detectCategoryIndex(headersNorm, [
          "categoria",
          "necessidade",
          "necessidades",
          "maiores_necessidades",
          "maiores necessidades",
          "doacao",
          "doação",
          "item",
        ]);

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
            fonte: idxFonte >= 0 ? String(r[idxFonte] ?? "").trim() : "",
          };
        });

        const filtered = parsed
          .filter((x) => isRJ(x.territorio))
          .filter((x) => (idxFonte >= 0 ? isFonteRedeAbrigo(x.fonte) : true));

        const dates = Array.from(new Set(filtered.map((x) => x.data).filter(Boolean))).sort();
        const last = dates[dates.length - 1];

        if (!last) {
          setNeedsData([]);
          return;
        }

        const rowsLast = filtered.filter((r) => r.data === last);

        const mapped = rowsLast
          .filter((r) => r.categoria && typeof r.valor === "number" && r.valor > 0)
          .map((r) => ({ name: r.categoria, value: r.valor as number }))
          .sort((a, b) => b.value - a.value);

        setNeedsData(mapped);
      })
      .catch(() => setNeedsData([]));
  }, []);

  // Labels de eixo X da evolução: mostra só o ano
  const evolutionTickFormatter = useMemo(() => {
    return (v: any) => getYear(v);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Evolução (eixo com ano, tooltip com data completa) */}
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
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                  labelFormatter={(label) => `Referência: ${formatDateBR(label)}`}
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

      {/* Distribuição por Faixa Etária (agora do Sheets) */}
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
                  width={90}
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

      {/* Recorte racial (substitui "Unidades por Estado") */}
      {racaData.length === 0 ? (
        <EmptyState title="Recorte racial" />
      ) : (
        <div className="chart-container animate-fade-in" style={{ animationDelay: "400ms" }}>
          <h3 className="section-title">Recorte racial</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={racaData}>
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
                  formatter={(value: number) => [value.toLocaleString("pt-BR"), "Acolhidos"]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {racaData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Doações / Maiores necessidades (substitui "Tipos de unidade") */}
      {needsData.length === 0 ? (
        <EmptyState title="Doações e maiores necessidades" />
      ) : (
        <div className="chart-container animate-fade-in" style={{ animationDelay: "500ms" }}>
          <h3 className="section-title">Doações e maiores necessidades</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={needsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
                >
                  {needsData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [value.toLocaleString("pt-BR"), "Ocorrências"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}