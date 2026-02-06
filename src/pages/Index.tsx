import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { KPICards } from "@/components/dashboard/KPICards";
import { OverviewCharts } from "@/components/dashboard/OverviewCharts";
import { FilterSection } from "@/components/dashboard/FilterSection";
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
  nota_explicativa?: string; // Nova coluna (opcional)
  sheet?: string;
  range?: string;
  tipo?: string;
  perfil?: string; // ✅ Adicionado
  titulo?: string;
  unidade?: string;
  territorio_col?: string;
  data_col?: string; // ✅ Adicionado
  valor_col?: string; // ✅ Adicionado
};

function parseNumberOrNull(v: unknown): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// headers só em minúsculo, sem alterar o texto (compatível com os nomes do catálogo)
function rowsToCatalog(values: any[][]): CatalogRow[] {
  if (!Array.isArray(values) || values.length < 2) return [];

  const headers = values[0].map((h) => String(h ?? "").trim().toLowerCase());
  const body = values.slice(1);

  return body.map((r) => {
    const obj: any = {};
    headers.forEach((headerName, index) => {
      if (!headerName) return;
      obj[headerName] = String(r?.[index] ?? "").trim();
    });
    return obj as CatalogRow;
  });
}

type AcolhidosRow = {
  territorio: string;
  data: string;
  modalidade: string;
  valor: number | null;
};

function computeTotalForDate(rows: AcolhidosRow[], date: string): number {
  const totalRow = rows.find(
    (r) => r.data === date && r.modalidade === "Em todos os acolhimentos"
  );
  if (totalRow && typeof totalRow.valor === "number") return totalRow.valor;

  return rows
    .filter(
      (r) =>
        r.data === date &&
        r.modalidade &&
        r.modalidade !== "Em todos os acolhimentos"
    )
    .reduce((acc, r) => acc + (typeof r.valor === "number" ? r.valor : 0), 0);
}

type AbrigosRow = {
  territorio: string;
  data: string;
  modalidade: string;
  valor: number | null;
};

function computeTotalAbrigosForDate(rows: AbrigosRow[], date: string): number {
  const totalRow =
    rows.find((r) => r.data === date && r.modalidade === "Todos os acolhimentos") ||
    rows.find((r) => r.data === date && r.modalidade === "Em todos os acolhimentos");

  if (totalRow && typeof totalRow.valor === "number") return totalRow.valor;

  return rows
    .filter(
      (r) =>
        r.data === date &&
        r.modalidade &&
        r.modalidade !== "Todos os acolhimentos" &&
        r.modalidade !== "Em todos os acolhimentos"
    )
    .reduce((acc, r) => acc + (typeof r.valor === "number" ? r.valor : 0), 0);
}

function shortModalidadeLabel(s: string) {
  const x = (s || "").trim();
  if (!x) return "";
  if (x === "Acolhimento Institucional") return "Institucional";
  if (x === "Famílias Acolhedoras") return "Famílias acolhedoras";
  if (x === "Casa-Lar") return "Casa-Lar";
  if (x === "Acolhimentos de Segunda à Sexta") return "Seg a sex";
  if (x === "Acolhimento para Aluno Residente") return "Aluno residente";
  if (x === "Acolhimento Especializado em Dependentes Químicos") return "Especializado";
  return x;
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
  const [kpiAcolhidosDetails, setKpiAcolhidosDetails] = useState<string[]>([]); // ✅ NOVO

  const [kpiUnidades, setKpiUnidades] = useState<number | null>(null);
  const [kpiUnidadesDetails, setKpiUnidadesDetails] = useState<string[]>([]);

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  // 1) Carrega catálogo do Sheets
  useEffect(() => {
    async function loadCatalogo() {
      setCatalogoLoading(true);
      try {
        const d = await getCatalogo("catalogo!A:Z");
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

  // 2) KPI (acolhidos): total do RJ no último período + variação % vs período anterior + breakdown por modalidade
  useEffect(() => {
    getIndicadorSheet("acolhidos")
      .then((d) => {
        const values: any[][] = d.values || [];
        if (values.length < 2) {
          setKpiAcolhidos(null);
          setKpiAcolhidosChangePct(null);
          setKpiAcolhidosDetails([]);
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
          setKpiAcolhidosDetails([]);
          return;
        }

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

        const rj = parsed.filter((x) => x.territorio === "RJ");
        const dates = Array.from(new Set(rj.map((x) => x.data).filter(Boolean))).sort();

        const last = dates[dates.length - 1];
        const prev = dates.length >= 2 ? dates[dates.length - 2] : null;

        if (!last) {
          setKpiAcolhidos(null);
          setKpiAcolhidosChangePct(null);
          setKpiAcolhidosDetails([]);
          return;
        }

        const lastTotal = computeTotalForDate(rj, last);
        setKpiAcolhidos(Number.isFinite(lastTotal) ? lastTotal : null);

        // Breakdown por modalidade no último período
        const rowsLast = rj.filter((x) => x.data === last);

        const byMod = new Map<string, number>();
        rowsLast.forEach((r) => {
          const mod = (r.modalidade || "").trim();
          if (!mod) return;
          if (mod === "Em todos os acolhimentos") return;

          const v = typeof r.valor === "number" ? r.valor : 0;
          if (!Number.isFinite(v) || v <= 0) return;

          byMod.set(mod, (byMod.get(mod) || 0) + v);
        });

        const order = [
          "Acolhimento Institucional",
          "Famílias Acolhedoras",
          "Casa-Lar",
          "Acolhimento Especializado em Dependentes Químicos",
          "Acolhimentos de Segunda à Sexta",
          "Acolhimento para Aluno Residente",
        ];

        const lines: string[] = [];
        order.forEach((mod) => {
          const v = byMod.get(mod);
          if (typeof v === "number" && v > 0) {
            lines.push(`${shortModalidadeLabel(mod)}: ${v.toLocaleString("pt-BR")}`);
          }
        });

        Array.from(byMod.entries())
          .filter(([mod]) => !order.includes(mod))
          .sort((a, b) => b[1] - a[1])
          .forEach(([mod, v]) => {
            if (v > 0) lines.push(`${shortModalidadeLabel(mod)}: ${v.toLocaleString("pt-BR")}`);
          });

        setKpiAcolhidosDetails(lines);

        // Variação percentual (mantido)
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
        setKpiAcolhidosDetails([]);
      });
  }, []);

  // 3) KPI (abrigos): total de entidades do RJ no último período + breakdown por modalidade
  useEffect(() => {
    getIndicadorSheet("abrigos")
      .then((d) => {
        const values: any[][] = d.values || [];
        if (values.length < 2) {
          setKpiUnidades(null);
          setKpiUnidadesDetails([]);
          return;
        }

        const headers = values[0].map((x) => String(x ?? "").trim().toLowerCase());
        const body = values.slice(1);

        const idxTerritorio = headers.indexOf("territorio");
        const idxData = headers.indexOf("data");
        const idxModalidade = headers.indexOf("modalidade");
        const idxValor = headers.indexOf("valor");

        if (idxTerritorio < 0 || idxData < 0 || idxModalidade < 0 || idxValor < 0) {
          setKpiUnidades(null);
          setKpiUnidadesDetails([]);
          return;
        }

        let lastDateAny = "";
        const parsed: AbrigosRow[] = body.map((r) => {
          const rawDate = String(r[idxData] ?? "").trim();
          if (rawDate) lastDateAny = rawDate;

          return {
            territorio: String(r[idxTerritorio] ?? "").trim(),
            data: rawDate || lastDateAny,
            modalidade: String(r[idxModalidade] ?? "").trim(),
            valor: parseNumberOrNull(r[idxValor]),
          };
        });

        const rj = parsed.filter((x) => x.territorio === "RJ");
        const dates = Array.from(new Set(rj.map((x) => x.data).filter(Boolean))).sort();
        const last = dates[dates.length - 1];

        if (!last) {
          setKpiUnidades(null);
          setKpiUnidadesDetails([]);
          return;
        }

        const lastTotal = computeTotalAbrigosForDate(rj, last);
        setKpiUnidades(Number.isFinite(lastTotal) ? lastTotal : null);

        const rowsLast = rj.filter((x) => x.data === last);

        const order = [
          "Acolhimento Institucional",
          "Famílias Acolhedoras",
          "Casa-Lar",
          "Acolhimento Especializado em Dependentes Químicos",
          "Acolhimentos de Segunda à Sexta",
          "Acolhimento para Aluno Residente",
        ];

        const byMod = new Map<string, number>();
        rowsLast.forEach((r) => {
          const mod = (r.modalidade || "").trim();
          if (!mod) return;
          if (mod === "Todos os acolhimentos" || mod === "Em todos os acolhimentos") return;

          const v = typeof r.valor === "number" ? r.valor : 0;
          if (!Number.isFinite(v) || v <= 0) return;

          byMod.set(mod, (byMod.get(mod) || 0) + v);
        });

        const lines: string[] = [];
        order.forEach((mod) => {
          const v = byMod.get(mod);
          if (typeof v === "number" && v > 0) {
            lines.push(`${shortModalidadeLabel(mod)}: ${v.toLocaleString("pt-BR")}`);
          }
        });

        Array.from(byMod.entries())
          .filter(([mod]) => !order.includes(mod))
          .sort((a, b) => b[1] - a[1])
          .forEach(([mod, v]) => {
            if (v > 0) lines.push(`${shortModalidadeLabel(mod)}: ${v.toLocaleString("pt-BR")}`);
          });

        setKpiUnidadesDetails(lines);
      })
      .catch(() => {
        setKpiUnidades(null);
        setKpiUnidadesDetails([]);
      });
  }, []);

  const KPI_BASE = [
    {
      id: "total_acolhidos",
      label: "Crianças e adolescentes acolhidos",
      value: null,
      unit: "",
    },
    {
      id: "total_unidades",
      label: "Entidades de acolhimento",
      value: null,
      unit: "",
    },
    {
      id: "frequencia_escolar",
      label: "Frequência escolar",
      value: null,
      unit: "%",
    },
    {
      id: "tempo_medio",
      label: "Tempo médio de acolhimento",
      value: null,
      unit: "anos",
    },
  ];

  const kpiData = useMemo(() => {
    return KPI_BASE.map((kpi) => {
      if (kpi.id === "total_acolhidos") {
        return {
          ...kpi,
          value: typeof kpiAcolhidos === "number" ? kpiAcolhidos : null,
          details: kpiAcolhidosDetails,
          change:
            typeof kpiAcolhidosChangePct === "number"
              ? Math.round(kpiAcolhidosChangePct * 10) / 10
              : undefined,
          changeLabel: kpiAcolhidosChangePct != null ? "vs período anterior" : undefined,
        };
      }

      if (kpi.id === "total_unidades") {
        return {
          ...kpi,
          value: typeof kpiUnidades === "number" ? kpiUnidades : null,
          details: kpiUnidadesDetails,
        };
      }

      return { ...kpi, value: null };
    });
  }, [kpiAcolhidos, kpiAcolhidosDetails, kpiAcolhidosChangePct, kpiUnidades, kpiUnidadesDetails]);

  const hasActiveFilters = Boolean(filters.area || filters.indicador);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />

      <main className="flex-1 container max-w-7xl mx-auto py-6 space-y-6">
        <section>
          <h2 className="section-title px-1">
            Visão Geral do Acolhimento | Estado do Rio de Janeiro
          </h2>
          <KPICards data={kpiData as any} />
        </section>

        <section>
          <OverviewCharts />
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

        {hasActiveFilters && (
          <section>
            <IndicatorResults filters={filters} catalogo={catalogo} />
          </section>
        )}

        <section className="pt-2">
          <LastUpdated />
        </section>
      </main>
    </div>
  );
}