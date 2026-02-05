import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LabelList, // ✅ Importado para mostrar os valores nas colunas
} from "recharts";
import type { PerfilVisualizacao } from "@/types/dashboard";

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

const PRIMARY_COLOR = "#359AD4";

interface ChartRendererProps {
  perfil?: PerfilVisualizacao | "linha" | "barras_agrupadas";
  data: any[];
  keys?: string[];
  unidade?: string;
  formatDateBR?: (date: string) => string;
  showBanner?: boolean;
  totalValue?: number;
}

export function ChartRenderer({
  perfil = "padrao",
  data,
  keys = ["value"],
  unidade,
  formatDateBR = (d) => d,
  showBanner = false,
  totalValue,
}: ChartRendererProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
        Sem dados para exibir
      </div>
    );
  }

  // ✅ Função para o Rótulo (Bold e Porcentagem abaixo) - USADO NA PIZZA
  const renderCustomLabel = ({ x, y, name, percent }: any) => {
    return (
      <text x={x} y={y} fill="currentColor" textAnchor="middle" dominantBaseline="central" className="fill-foreground">
        <tspan x={x} dy="-0.5em" fontWeight="bold">{name}</tspan>
        <tspan x={x} dy="1.2em">{(percent * 100).toFixed(1)}%</tspan>
      </text>
    );
  };

  // ✅ Gráfico de Linha (Evolução Padrão)
  if (perfil === "linha") {
    return (
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} tickFormatter={formatDateBR} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip labelFormatter={formatDateBR} />
            <Line type="monotone" dataKey="value" stroke={PRIMARY_COLOR} strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ✅ Gráfico de Barras Agrupadas (Evolução Pizza) - ALTERADO PARA ADICIONAR LEGENDA E PORCENTAGEM
  if (perfil === "barras_agrupadas") {
    return (
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} tickFormatter={formatDateBR} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip labelFormatter={formatDateBR} />
            <Legend verticalAlign="bottom" height={36} /> {/* ✅ Legenda adicionada embaixo */}
            {keys.map((key, index) => (
              <Bar 
                key={key} 
                dataKey={key} 
                fill={CHART_COLORS[index % CHART_COLORS.length]} 
                radius={[4, 4, 0, 0]} 
              >
                {/* ✅ LabelList adicionado para mostrar a porcentagem no topo da coluna */}
                <LabelList
                  dataKey={key}
                  position="top"
                  content={(props: any) => {
                    const { x, y, width, value, index: dataIndex } = props;
                    const row = data[dataIndex];
                    const total = keys.reduce((sum, k) => sum + (Number(row[k]) || 0), 0);
                    const pct = total > 0 ? ((value / total) * 100).toFixed(1) + "%" : "";
                    return (
                      <text x={x + width / 2} y={y - 10} fill="hsl(var(--muted-foreground))" fontSize={10} textAnchor="middle">
                        {pct}
                      </text>
                    );
                  }}
                />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ✅ PERFIL PADRÃO (Mantido original)
  if (perfil === "padrao") {
    return (
      <div className="flex flex-col w-full">
        {showBanner && typeof totalValue === "number" && (
          <div className="mb-6 rounded-xl border bg-background p-4 text-left">
            <div className="text-4xl font-semibold tracking-tight text-foreground">
              {totalValue.toLocaleString("pt-BR")}
            </div>
            {unidade && <div className="text-sm text-muted-foreground mt-1">{unidade}</div>}
          </div>
        )}

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", dy: 10 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                interval={0}
                angle={0}
                textAnchor="middle"
                height={60}
              />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: "hsl(var(--border))" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px" }}
                formatter={(value: number) => [Number(value).toLocaleString("pt-BR"), unidade || "valor"]}
              />
              <Bar dataKey="value" fill={PRIMARY_COLOR} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // ✅ PERFIL PIZZA (Mantido original)
  if (perfil === "pizza") {
    return (
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {typeof totalValue === "number" && (
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground font-bold" style={{ fontSize: "24px" }}>
                {totalValue.toLocaleString("pt-BR")}
              </text>
            )}
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={true}
              label={renderCustomLabel}
              innerRadius={80}
              outerRadius={120}
              paddingAngle={5}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="none" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}