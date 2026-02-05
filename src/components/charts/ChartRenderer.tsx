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
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        Sem dados para exibir
      </div>
    );
  }

  // ✅ PERFIL PADRÃO: Gráfico de Barras
  if (perfil === "padrao") {
    return (
      <>
        {showBanner && typeof totalValue === "number" && (
          <div className="mb-6 rounded-xl border bg-background p-4">
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

        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              tick={{
                fontSize: 11,
                fill: "hsl(var(--muted-foreground))",
                dy: 10,
              }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              interval={0}
              angle={0}
              textAnchor="middle"
              height={60}
            />
            <YAxis
              tick={{
                fontSize: 12,
                fill: "hsl(var(--muted-foreground))",
              }}
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
      </>
    );
  }

  // ✅ PERFIL PIZZA: Gráfico de Pizza com percentuais
  if (perfil === "pizza") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={true} // ✅ Ativado: Adiciona a linha de conexão
            label={({ name, percent }) =>
              `${name}: ${(percent * 100).toFixed(1)}%`
            }
            innerRadius={80}  // Define o tamanho do "furo" central
            outerRadius={120} // Mantém o tamanho total do gráfico
            paddingAngle={5}  // Adiciona um pequeno espaço entre as fatias
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          {/* ✅ Tooltip removido para não aparecer nada ao passar o mouse */}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // Fallback
  return (
    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
      Perfil "{perfil}" não implementado
    </div>
  );
}