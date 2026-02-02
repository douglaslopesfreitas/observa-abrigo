import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";

type Row = {
  territorio: string;
  data: string;        // yyyy-mm-dd
  modalidade: string;
  valor: number;
  fonte?: string;
};

type Mode = "foto" | "evolucao" | "composicao";

function parseNumber(v: any) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function asStr(v: any) {
  return String(v ?? "").trim();
}

function fillMergedDates(rows: any[][], idxData: number) {
  let lastDate = "";
  return rows.map((r) => {
    const d = asStr(r[idxData]);
    if (d) lastDate = d;
    return { raw: r, filledDate: d || lastDate };
  });
}

function ptBR(v: number) {
  return v.toLocaleString("pt-BR");
}

export function AcolhidosIndicadorCharts(props: {
  sheetValues: any[][];
  territorio: string; // exemplo: "RJ"
  title?: string;
}) {
  const { sheetValues, territorio, title = "Acolhidos por modalidade de acolhimento" } = props;
  const [mode, setMode] = useState<Mode>("foto");

  const parsed = useMemo<Row[]>(() => {
    const values = Array.isArray(sheetValues) ? sheetValues : [];
    if (values.length < 2) return [];

    const headers = values[0].map((x) => asStr(x).toLowerCase());
    const rows = values.slice(1);

    const idxTerritorio = headers.indexOf("territorio");
    const idxData = headers.indexOf("data");
    const idxModalidade = headers.indexOf("modalidade");
    const idxValor = headers.indexOf("valor");
    const idxFonte = headers.indexOf("fonte");

    if (idxTerritorio < 0 || idxData < 0 || idxModalidade < 0 || idxValor < 0) return [];

    const filled = fillMergedDates(rows, idxData);

    return filled.map(({ raw, filledDate }) => ({
      territorio: asStr(raw[idxTerritorio]),
      data: filledDate,
      modalidade: asStr(raw[idxModalidade]),
      valor: parseNumber(raw[idxValor]),
      fonte: idxFonte >= 0 ? asStr(raw[idxFonte]) : undefined,
    }));
  }, [sheetValues]);

  const onlyTerritory = useMemo(() => parsed.filter((r) => r.territorio === territorio), [parsed, territorio]);

  const lastDate = useMemo(() => {
    const dates = onlyTerritory.map((r) => r.data).filter(Boolean);
    if (!dates.length) return "";
    return dates[dates.length - 1];
  }, [onlyTerritory]);

  const fotoData = useMemo(() => {
    if (!lastDate) return [];
    const rows = onlyTerritory.filter((r) => r.data === lastDate);
    const cleaned = rows
      .filter((r) => r.modalidade && r.modalidade.toLowerCase() !== "em todos os acolhimentos")
      .map((r) => ({ name: r.modalidade, value: r.valor }));
    return cleaned;
  }, [onlyTerritory, lastDate]);

  const evolucaoTotal = useMemo(() => {
    if (!onlyTerritory.length) return [];
    const byDate = new Map<string, number>();
    for (const r of onlyTerritory) {
      if (r.modalidade === "Em todos os acolhimentos" && r.data) {
        byDate.set(r.data, r.valor);
      }
    }
    return Array.from(byDate.entries()).map(([date, value]) => ({ name: date, value }));
  }, [onlyTerritory]);

  const composicao = useMemo(() => {
    if (!onlyTerritory.length) return [];
    const dates = Array.from(new Set(onlyTerritory.map((r) => r.data).filter(Boolean)));

    const modalities = Array.from(
      new Set(
        onlyTerritory
          .map((r) => r.modalidade)
          .filter(Boolean)
          .filter((m) => m.toLowerCase() !== "em todos os acolhimentos")
      )
    );

    const byDate = new Map<string, Record<string, number>>();
    for (const d of dates) byDate.set(d, {});

    for (const r of onlyTerritory) {
      if (!r.data) continue;
      if (!r.modalidade) continue;
      if (r.modalidade.toLowerCase() === "em todos os acolhimentos") continue;

      const obj = byDate.get(r.data) || {};
      obj[r.modalidade] = (obj[r.modalidade] ?? 0) + (Number.isFinite(r.valor) ? r.valor : 0);
      byDate.set(r.data, obj);
    }

    return dates.map((d) => {
      const obj = byDate.get(d) || {};
      const row: any = { name: d };
      for (const m of modalities) row[m] = obj[m] ?? 0;
      return row;
    });
  }, [onlyTerritory]);

  const modalitiesForStack = useMemo(() => {
    if (!composicao.length) return [];
    const keys = Object.keys(composicao[0] || {}).filter((k) => k !== "name");
    return keys;
  }, [composicao]);

  return (
    <div className="chart-container">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h3 className="section-title">{title}</h3>
          {mode === "foto" && lastDate ? (
            <p className="text-sm text-muted-foreground">Fotografia atual em {lastDate}</p>
          ) : null}
        </div>

        <div className="flex gap-2">
          <button
            className={`px-3 h-9 rounded-md border text-sm ${
              mode === "foto" ? "bg-foreground text-background" : "bg-background"
            }`}
            onClick={() => setMode("foto")}
            type="button"
          >
            Fotografia atual
          </button>

          <button
            className={`px-3 h-9 rounded-md border text-sm ${
              mode === "evolucao" ? "bg-foreground text-background" : "bg-background"
            }`}
            onClick={() => setMode("evolucao")}
            type="button"
          >
            Evolução do total
          </button>

          <button
            className={`px-3 h-9 rounded-md border text-sm ${
              mode === "composicao" ? "bg-foreground text-background" : "bg-background"
            }`}
            onClick={() => setMode("composicao")}
            type="button"
          >
            Composição do total
          </button>
        </div>
      </div>

      <div className="h-80">
        {mode === "foto" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fotoData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [ptBR(Number(value)), "Acolhidos"]}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {mode === "evolucao" && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolucaoTotal}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [ptBR(Number(value)), "Total"]}
              />
              <Line type="monotone" dataKey="value" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {mode === "composicao" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={composicao}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number, name: string) => [ptBR(Number(value)), name]}
              />
              <Legend />
              {modalitiesForStack.map((key) => (
                <Bar key={key} dataKey={key} stackId="a" />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}