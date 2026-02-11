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
  Legend,
  LabelList,
  Tooltip,
} from "recharts";
import type { PerfilVisualizacao } from "@/types/dashboard";

const CHART_COLORS = [
  "#2674a0",
  "#E67310",
  "#72C0F8",
  "#FFCE19",
  "#175070",
  "#FA841E",
  "#C9E3FC",
  "#FFB114",
  "#0A2E43",
  "#9F5125",
  "#f7efba",
  "#02121E",
];

const PRIMARY_COLOR = "#359AD4";

interface ChartRendererProps {
  perfil?: PerfilVisualizacao | "linha" | "barras_agrupadas" | "barras_horizontais_percentual" | "barras_horizontais";
  data: any[];
  keys?: string[];
  unidade?: string;
  formatDateBR?: (date: string) => string;
  showBanner?: boolean;
  totalValue?: number;
}

// ✅ Tooltip customizado para gráficos simples (linha e barras padrão)
function SimpleTooltip({
  active,
  payload,
  label,
  unidade,
  formatDateBR,
}: {
  active?: boolean;
  payload?: any[];
  label?: any;
  unidade?: string;
  formatDateBR?: (date: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const value = payload[0]?.value;
  if (value == null) return null;

  return (
    <div
      style={{
        backgroundColor: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "12px",
        padding: "10px 12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        minWidth: 180,
      }}
    >
      <div
        style={{
          fontSize: 12,
          marginBottom: 6,
          color: "hsl(var(--foreground))",
          fontWeight: 500,
        }}
      >
        {formatDateBR ? formatDateBR(String(label)) : String(label)}
      </div>

      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "hsl(var(--foreground))",
        }}
      >
        {typeof value === "number"
          ? value.toLocaleString("pt-BR")
          : value}
        {unidade ? ` ${unidade}` : ""}
      </div>
    </div>
  );
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

  // ✅ 1. Evolução Quantitativa (LINHA) - AGORA COM BOLINHAS PREENCHIDAS
  if (perfil === "linha") {
    return (
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} tickFormatter={formatDateBR} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              content={<SimpleTooltip unidade={unidade} formatDateBR={formatDateBR} />} 
              cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={PRIMARY_COLOR} 
              strokeWidth={3} 
              // ✅ Bolinha preenchida com borda branca para destaque
              dot={{ r: 5, fill: PRIMARY_COLOR, stroke: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 7, strokeWidth: 0 }}
              isAnimationActive={true} 
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ✅ 2. Evolução de Distribuição (BARRAS AGRUPADAS)
  if (perfil === "barras_agrupadas") {
    return (
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} tickFormatter={formatDateBR} />
            <YAxis tick={{ fontSize: 12 }} />
            <Legend verticalAlign="bottom" height={36}/>
            {keys.map((key, index) => (
              <Bar 
                key={key} 
                dataKey={key} 
                fill={CHART_COLORS[index % CHART_COLORS.length]} 
                radius={[4, 4, 0, 0]} 
                isAnimationActive={true}
                animationDuration={1500}
                animationBegin={index * 100}
              >
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

  // ✅ 3. PERFIL PADRÃO (Barras verticais quantitativas)
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
                content={<SimpleTooltip unidade={unidade} formatDateBR={formatDateBR} />}
                cursor={{ fill: "hsl(var(--accent))", opacity: 0.1 }}
              />
              <Bar 
                dataKey="value" 
                fill={PRIMARY_COLOR} 
                radius={[8, 8, 0, 0]} 
                isAnimationActive={true} 
                animationDuration={1500}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // ✅ 4. PERFIL BARRAS HORIZONTAIS (Percentual ou Quantitativo)
  if (perfil === "barras_horizontais_percentual" || perfil === "barras_horizontais") {
    const isPct = perfil === "barras_horizontais_percentual";
    return (
      <div className="h-[500px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="vertical" 
            margin={{ left: 20, right: 60, top: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
            <XAxis 
              type="number" 
              domain={isPct ? [0, 100] : [0, 'auto']} 
              tickFormatter={(v) => isPct ? `${v}%` : v.toLocaleString('pt-BR')} 
              tick={{ fontSize: 12 }} 
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={160} // Aumentado para nomes de categorias longas
              tick={{ fontSize: 11 }} 
              interval={0} 
            />
            <Tooltip 
              content={<SimpleTooltip unidade={isPct ? "%" : unidade} />} 
              cursor={{ fill: "hsl(var(--accent))", opacity: 0.1 }} 
            />
            <Bar 
              dataKey="value" 
              isAnimationActive={true} 
              animationDuration={1500} 
              radius={[0, 4, 4, 0]} 
              barSize={25}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ✅ 5. PERFIL PIZZA
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
              isAnimationActive={true}
              animationDuration={1500}
              animationBegin={0}
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