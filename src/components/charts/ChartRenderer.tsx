import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
  perfil?: PerfilVisualizacao;
  data: any[];
  unidade?: string;
  formatDateBR?: (date: string) => string;
  showBanner?: boolean;
  totalValue?: number;
}

export function ChartRenderer({
  perfil = "padrao",
  data,
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

  // ✅ Função Customizada para o Rótulo (Apenas quebra de linha e bold)
  const renderCustomLabel = ({ x, y, name, percent }: any) => {
    return (
      <text
        x={x}
        y={y}
        fill="currentColor"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground"
      >
        <tspan x={x} dy="-0.5em" fontWeight="bold">
          {name}
        </tspan>
        <tspan x={x} dy="1.2em">
          {(percent * 100).toFixed(1)}%
        </tspan>
      </text>
    );
  };

  // ✅ PERFIL PADRÃO: Gráfico de Barras
  if (perfil === "padrao") {
    return (
      <div className="flex flex-col w-full">
        {showBanner && typeof totalValue === "number" && (
          <div className="mb-6 rounded-xl border bg-background p-4 text-left">
            <div className="text-4xl font-semibold tracking-tight text-foreground">
              {totalValue.toLocaleString("pt-BR")}
            </div>
            {unidade && (
              <div className="text-sm text-muted-foreground mt-1">
                {unidade}
              </div>
            )}
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
                  unidade || "valor",
                ]}
              />
              <Bar dataKey="value" fill={PRIMARY_COLOR} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // ✅ PERFIL PIZZA (DONUT)
  if (perfil === "pizza") {
    return (
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {/* Valor Total no centro */}
            {typeof totalValue === "number" && (
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground font-bold"
                style={{ fontSize: "24px" }}
              >
                {totalValue.toLocaleString("pt-BR")}
              </text>
            )}

            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={true}
              label={renderCustomLabel} // ✅ Aplica o rótulo customizado
              innerRadius={80}   // Restaurado original
              outerRadius={120}  // Restaurado original
              paddingAngle={5}   // Restaurado original
              fill="#8884d8"
              dataKey="value"
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  stroke="none"
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}