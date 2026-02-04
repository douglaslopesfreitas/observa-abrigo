import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { KPICards } from "@/components/dashboard/KPICards";
import { OverviewCharts } from "@/components/dashboard/OverviewCharts";
import { FilterSection } from "@/components/dashboard/FilterSection";
import { overviewKPIs } from "@/data/mockData";
import type { FilterState } from "@/types/dashboard";
import { getCatalogo, getIndicadorSheet } from "@/services/sheetsApi";
import { IndicatorResults } from "@/components/dashboard/IndicatorResults";
import { LastUpdated } from "@/components/dashboard/LastUpdated";

type CatalogRow = {
  area?: string;
  indicador_id?: string;
  indicador_nome?: string;
  fonte?: string;
  fonte_url?: string;
  sheet?: string;
  range?: string;
  tipo?: string;
  titulo?: string;
  unidade?: string;
  territorio_col?: string;
};

function parseNumberOrNull(v: unknown): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function rowsToCatalog(values: any[][]): CatalogRow[] {
  if (!Array.isArray(values) || values.length < 2) return [];
  const headers = values[0].map((h) => String(h ?? "").trim());
  const body = values.slice(1);

  return body.map((r) => {
    const obj: any = {};
    headers.forEach((h, i) => {
      obj[h] = r[i];
    });

    return {
      area: String(obj["area"] ?? "").trim(),
      indicador_id: String(obj["indicador_id"] ?? "").trim(),
      indicador_nome: String(obj["indicador_nome"] ?? "").trim(),
      fonte: String(obj["fonte"] ?? "").trim(),
      fonte_url: String(obj["fonte_url"] ?? "").trim(),
      sheet: String(obj["sheet"] ?? "").trim(),
      range: String(obj["range"] ?? "").trim(),
      tipo: String(obj["tipo"] ?? "").trim(),
      titulo: String(obj["titulo"] ?? "").trim(),
      unidade: String(obj["unidade"] ?? "").trim(),
      territorio_col: String(obj["territorio_col"] ?? "").trim(),
    };
  });
}

type AcolhidosRow = {
  territorio: string;
  data: string;
  modalidade: string;
  valor: number | null;
};

function computeTotalForDate(rows: AcolhidosRow[], date: string): number {
  // Preferência: linha "Em todos os acolhimentos"
  const totalRow = rows.find(
    (r) => r.data === date && r.modalidade === "Em todos os acolhimentos"
  );
  if (totalRow && typeof totalRow.valor === "number") return totalRow.valor;

  // Fallback: soma modalidades do mesmo período (exceto a linha total)
  return rows
    .filter(
      (r) =>
        r.data === date &&
        r.modalidade &&
        r.modalidade !== "Em todos os acolhimentos"
    )
    .reduce((acc, r) => acc + (typeof r.valor === "number" ? r.valor : 0), 0);
}

export default function Index() {
  const [filters, setFilters] = useState<FilterState>({
    area: null,
    indicador: null,
    fonte: null,
    territorio: null,
  });

  const [catalogo, setCatalogo] = useState<CatalogRow[]>([]);
  const [catalogoLoading, setCatalogoLoading] = useState(false);

  const [kpiAcolhidos, setKpiAcolhidos] = useState<number | null>(null);
  const [kpiAcolhidosChangePct, setKpiAcolhidosChangePct] = useState<number | null>(null);

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  // 1) Carrega catálogo do Sheets
  useEffect(() => {
    async function loadCatalogo() {
      setCatalogoLoading(true);
      try {
        const d = await getCatalogo("catalogo!A:K");
        const values: any[][] = d.values || [];
        setCatalogo(rowsToCatalog(values));
      } catch {
        setCatalogo([]);
      } finally {
        setCatalogoLoading(false);
      }
    }
    loadCatalogo();
  }, []);

  // 2) KPI automático (acolhidos): total do RJ no último período + variação % vs período anterior
  useEffect(() => {
    getIndicadorSheet("acolhidos")
      .then((d) => {
        const values: any[][] = d.values || [];
        if (values.length < 2) {
          setKpiAcolhidos(null);
          setKpiAcolhidosChangePct(null);
          return;
        }

        const headers = values[0].map((x) => String(x ?? "").trim().toLowerCase());
        const body = values.slice(1);

        const idxTerritorio = headers.indexOf("territorio");
        const idxData = headers.indexOf("data");
        const idxModalidade = headers.indexOf("modalidade");
        const idxValor = headers.indexOf("valor");

        if (idxTerritorio < 0 || idxData < 0 || idxModalidade < 0 || idxValor < 0) {
          setKpiAcolhidos(null);
          setKpiAcolhidosChangePct(null);
          return;
        }

        // Corrige datas mescladas (igual no IndicatorResults)
        let lastDateAny = "";
        const parsed: AcolhidosRow[] = body.map((r) => {
          const rawDate = String(r[idxData] ?? "").trim();
          if (rawDate) lastDateAny = rawDate;

          return {
            territorio: String(r[idxTerritorio] ?? "").trim(),
            data: rawDate || lastDateAny,
            modalidade: String(r[idxModalidade] ?? "").trim(),
            valor: parseNumberOrNull(r[idxValor]),
          };
        });

        // Recorte RJ
        const rj = parsed.filter((x) => x.territorio === "RJ");

        // Datas ordenadas do RJ
        const dates = Array.from(new Set(rj.map((x) => x.data).filter(Boolean))).sort();
        const last = dates[dates.length - 1];
        const prev = dates.length >= 2 ? dates[dates.length - 2] : null;

        if (!last) {
          setKpiAcolhidos(null);
          setKpiAcolhidosChangePct(null);
          return;
        }

        const lastTotal = computeTotalForDate(rj, last);
        setKpiAcolhidos(Number.isFinite(lastTotal) ? lastTotal : null);

        if (prev) {
          const prevTotal = computeTotalForDate(rj, prev);
          if (prevTotal > 0) {
            const pct = ((lastTotal - prevTotal) / prevTotal) * 100;
            setKpiAcolhidosChangePct(Number.isFinite(pct) ? pct : null);
          } else {
            setKpiAcolhidosChangePct(null);
          }
        } else {
          setKpiAcolhidosChangePct(null);
        }
      })
      .catch(() => {
        setKpiAcolhidos(null);
        setKpiAcolhidosChangePct(null);
      });
  }, []);

  const kpiData = useMemo(() => {
    const arr = [...overviewKPIs];

    // KPI 1: total
    if (arr.length > 0) {
      arr[0] = {
        ...arr[0],
        id: "total_acolhidos",
        label: "Crianças e adolescentes acolhidos",
        value: kpiAcolhidos ?? (arr[0] as any).value,
        unit: "",
      } as any;
    }

    // KPI 2: evolução (%)
    if (arr.length > 1) {
      const pct = kpiAcolhidosChangePct;
      const sign = typeof pct === "number" && pct > 0 ? "+" : "";
      arr[1] = {
        ...arr[1],
        id: "evolucao_acolhidos",
        label: "Evolução do acolhimento",
        value:
          typeof pct === "number"
            ? `${sign}${pct.toFixed(1)}%`
            : (arr[1] as any).value,
        unit: "",
      } as any;
    }

    return arr;
  }, [kpiAcolhidos, kpiAcolhidosChangePct]);

  const hasActiveFilters = Boolean(filters.area || filters.indicador);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />

      <main className="flex-1 container max-w-7xl mx-auto py-6 space-y-6">
        <section>
          <h2 className="section-title px-1">Visão Geral do Acolhimento</h2>
          <KPICards data={kpiData as any} />
        </section>

        <section>
          <OverviewCharts />
        </section>

        {/* ✅ Atualizado em: sempre aparece aqui, mesmo sem indicador */}
        <section>
          <LastUpdated />
        </section>

        <section className="pt-4">
          {catalogoLoading ? (
            <div className="text-sm text-muted-foreground">Carregando catálogo...</div>
          ) : null}

          <FilterSection
            filters={filters}
            onFilterChange={handleFilterChange}
            catalogo={catalogo as any}
          />
        </section>

        {/* 3) Aqui é onde os botões e gráficos do indicador aparecem */}
        {hasActiveFilters && (
          <section>
            <IndicatorResults filters={filters} catalogo={catalogo} />
          </section>
        )}
      </main>
    </div>
  );
}