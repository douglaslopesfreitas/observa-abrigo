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
  // ✅ Adicionado suporte aos novos tipos de evolução
  perfil?: PerfilVisualizacao | "linha" | "barras_agrupadas"; 
  data: any[];
  keys?: string[]; // ✅ Adicionado para as barras lado a lado
  unidade?: string;
  formatDateBR?: (date: string) => string;
  showBanner?: boolean;
  totalValue?: number;
}

export function ChartRenderer({
  perfil = "padrao",
  data,
  keys = ["value"], // ✅ Valor padrão é "value" para não quebrar o padrão
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

  // ✅ NOVO: Gráfico de Linha (Para evolução do perfil padrão)
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

  // ✅ NOVO: Gráfico de Barras Agrupadas (Lado a lado - para evolução da pizza)
  if (perfil === "barras_agrupadas") {
    return (
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} tickFormatter={formatDateBR} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip labelFormatter={formatDateBR} />
            {keys.map((key, index) => (
              <Bar 
                key={key} 
                dataKey={key} 
                fill={CHART_COLORS[index % CHART_COLORS.length]} 
                radius={[4, 4, 0, 0]} 
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ✅ PERFIL PADRÃO (Mantido exatamente como você enviou)
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

  // ✅ PERFIL PIZZA: Gráfico de Pizza (Mantido exatamente como você enviou)
  if (perfil === "pizza") {
    return (
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={true}
              label={({ name, percent }) =>
                `${name}: ${(percent * 100).toFixed(1)}%`
              }
              innerRadius={80}
              outerRadius={120}
              paddingAngle={5}
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
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}