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

export function OverviewCharts() {
  // Mantém o mock por enquanto. Depois vamos trocar para dados do Sheets.
  const ageData = mockDataRecords
    .filter((r) => r.indicador_id === "faixa_etaria" && r.territorio_nome === "Brasil")
    .map((r) => ({ name: r.categoria, value: r.valor }));

  const evolutionData = mockDataRecords
    .filter((r) => r.indicador_id === "serie_temporal")
    .map((r) => ({ name: r.periodo, value: r.valor }));

  const stateData = mockDataRecords
    .filter((r) => r.indicador_id === "total_unidades" && r.territorio_tipo === "uf")
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5)
    .map((r) => ({ name: r.territorio_nome, value: r.valor }));

  const typeData = mockDataRecords
    .filter((r) => r.indicador_id === "tipo_unidade")
    .map((r) => ({ name: r.categoria, value: r.valor }));

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

      {/* Top 5 estados */}
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
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tipos de unidade */}
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
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
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
