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
  Tooltip,
  LabelList,
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
  perfil?:
    | PerfilVisualizacao
    | "linha"
    | "barras_agrupadas"
    | "barras_empilhadas"
    | "barras_horizontais_percentual"
    | "barras_horizontais"
    | "pizza"
    | "padrao";
  data: any[];
  keys?: string[];
  unidade?: string;
  formatDateBR?: (date: string) => string;
  showBanner?: boolean;
  totalValue?: number;
}

function SimpleTooltip({
   active,
  payload,
  label,
  total,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  total?: number;
}) {
  if (!active || !payload || payload.length === 0) return null;

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
      {/* 🍩 CASO PIZZA */}
      {typeof total === "number" && payload.length === 1 && (() => {
  const p = payload[0]
  const value = Number(p?.payload?.value ?? p?.value ?? 0)

  const percent =
    total > 0
      ? ((value / total) * 100).toFixed(1)
      : "0.0"

  const color =
  p?.payload?.fill ||
  p?.payload?.color ||
  p?.fill ||
  p?.color

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: 2,
          backgroundColor: color,
        }}
      />
      <div style={{ fontSize: 13 }}>
        {p?.name}: <strong>{percent}%</strong>
      </div>
    </div>
  )
})()}

{/* 📈 CASO LINHA (EVOLUÇÃO) */}
{payload.length === 1 && typeof total !== "number" && !label && (() => {
  const p = payload[0]
  const value = Number(p?.value ?? 0)

  return (
    <div>
      <div
        style={{
          fontSize: 12,
          opacity: 0.7,
          marginBottom: 4,
        }}
      >
        {new Date(label).toLocaleDateString("pt-BR")}
      </div>

      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        {value.toLocaleString("pt-BR")}
      </div>
    </div>
  )
})()}

{/* 📊 CASO BARRA SIMPLES */}
{payload.length === 1 && typeof total !== "number" && !label && (() => {
  const p = payload[0]
  const value = Number(p?.value ?? 0)

  const color =
    p?.payload?.fill ||
    p?.fill ||
    p?.color
   
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: 2,
          backgroundColor: color,
        }}
      />
      <div style={{ fontSize: 13 }}>
                {p?.payload?.name}:{" "}
        <strong>{value.toLocaleString("pt-BR")}</strong>
      </div>
    </div>
  )
})()}

      {/* 📊 CASO BARRAS EMPILHADAS */}
      {payload.length > 1 &&
        payload.map((p, i) => {
          const value = Number(p?.value ?? 0);

          const totalStack = payload.reduce(
            (acc, item) => acc + Number(item?.value ?? 0),
            0
          );

          const percent =
            totalStack > 0
              ? ((value / totalStack) * 100).toFixed(1)
              : "0.0";

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                 backgroundColor: p?.fill || p?.color
                }}
              />
              <div style={{ fontSize: 13 }}>
                {p?.name}: <strong>{percent}%</strong>
              </div>
            </div>
          );
        })}
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

// 🔹 LINHA
if (perfil === "linha") {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tickFormatter={formatDateBR} />
          <YAxis />

          <Tooltip content={<SimpleTooltip />} />

          <Line
            type="monotone"
            dataKey="value"
            stroke={PRIMARY_COLOR}
            strokeWidth={3}
            dot={{ r: 5, fill: PRIMARY_COLOR, stroke: "#fff", strokeWidth: 2 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

  // 🔹 BARRAS AGRUPADAS
  if (perfil === "barras_agrupadas") {
    return (
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tickFormatter={formatDateBR} />
            <YAxis />
            <Legend />
            <Tooltip
              content={
                <SimpleTooltip
                  unidade={unidade}
                  formatDateBR={formatDateBR}
                />
              }
            />
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

  // 🔹 BARRAS EMPILHADAS
  if (perfil === "barras_empilhadas") {
    return (
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tickFormatter={formatDateBR} />
            <YAxis />
            <Legend />
            <Tooltip
              content={
                <SimpleTooltip
                  unidade={unidade}
                  formatDateBR={formatDateBR}
                />
              }
            />
            {keys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="a"
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // 🔹 PADRÃO
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
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                content={
                  <SimpleTooltip
                    unidade={unidade}
                    formatDateBR={formatDateBR}
                  />
                }
              />
              <Bar
                dataKey="value"
                fill={PRIMARY_COLOR}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // 🔹 BARRAS HORIZONTAIS
  if (
    perfil === "barras_horizontais_percentual" ||
    perfil === "barras_horizontais"
  ) {
    const isPct = perfil === "barras_horizontais_percentual";

    return (
      <div className="h-[500px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={isPct ? [0, 100] : [0, "auto"]} />
            <YAxis type="category" dataKey="name" width={150} />
            <Tooltip
              content={
                <SimpleTooltip
                  unidade={unidade}
                  formatDateBR={formatDateBR}
                />
              }
            />
            <Bar dataKey="value">
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  
// 🔹 PIZZA
if (perfil === "pizza") {
  const RADIAN = Math.PI / 180;

  const renderCustomLabel = (props: any) => {
    const {
      cx,
      cy,
      midAngle,
      outerRadius,
      percent,
      name,
      fill,
    } = props;

    const lineRadius = outerRadius + 10;
    const textRadius = outerRadius + 25;

    const lineX = cx + lineRadius * Math.cos(-midAngle * RADIAN);
    const lineY = cy + lineRadius * Math.sin(-midAngle * RADIAN);

    const textX = cx + textRadius * Math.cos(-midAngle * RADIAN);
    const textY = cy + textRadius * Math.sin(-midAngle * RADIAN);

    return (
      <g>
        <line
          x1={lineX}
          y1={lineY}
          x2={textX}
          y2={textY}
          stroke={fill}
          strokeWidth={1}
        />
        <text
          x={textX}
          y={textY}
          fill={fill}
          textAnchor={textX > cx ? "start" : "end"}
          dominantBaseline="central"
          fontSize={16}
          fontWeight={600}
        >
          {name} ({(percent * 100).toFixed(1)}%)
        </text>
      </g>
    );
  };

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
  content={
    <SimpleTooltip
      total={data.reduce(
        (acc, item) => acc + Number(item.value),
        0
      )}
    />
  }
/>

          <Pie
  data={data.map((item, index) => ({
    ...item,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }))}
  dataKey="value"
  nameKey="name"
  cx="50%"
  cy="50%"
  innerRadius={80}
  outerRadius={120}
  label={renderCustomLabel}
  labelLine={false}
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