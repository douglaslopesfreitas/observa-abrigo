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
  nota_explicativa?: string;
  sheet?: string;
  range?: string;
  tipo?: string;
  perfil?: string;
  titulo?: string;
  unidade?: string;
  territorio_col?: string;
  data_col?: string;
  valor_col?: string;
};

function parseNumberOrNull(v: unknown): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

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

function normTxt(s: unknown) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isTotalLabel(s: string) {
  const x = normTxt(s);
  return x.includes("todos") || x.includes("todas") || x.includes("em_todos") || x.includes("em_todas");
}

// === Regras de agrupamento que você pediu ===
// "Acolhimento Institucional" + "Casa-Lar" => "Abrigos"
function groupModalidade(raw: string) {
  const x = (raw || "").trim();
  if (x === "Acolhimento Institucional" || x === "Casa-Lar") return "Abrigos";
  return x;
}

function labelModalidade(raw: string) {
  const x = (raw || "").trim();
  if (!x) return "";
  if (x === "Abrigos") return "Abrigos";
  if (x === "Famílias Acolhedoras") return "Famílias acolhedoras";
  if (x === "Acolhimento Especializado em Dependentes Químicos") return "Especializado";
  if (x === "Acolhimentos de Segunda à Sexta") return "Seg a sex";
  if (x === "Acolhimento para Aluno Residente") return "Aluno residente";
  return x;
}

type AcolhidosRow = {
  territorio: string;
  data: string;
  modalidade: string;
  valor: number | null;
};

function computeTotalForDate(rows: AcolhidosRow[], date: string): number {
  const totalRow = rows.find((r) => r.data === date && isTotalLabel(r.modalidade));
  if (totalRow && typeof totalRow.valor === "number") return totalRow.valor;

  return rows
    .filter((r) => r.data === date && r.modalidade && !isTotalLabel(r.modalidade))
    .reduce((acc, r) => acc + (typeof r.valor === "number" ? r.valor : 0), 0);
}

type AbrigosRow = {
  territorio: string;
  data: string;
  modalidade: string;
  valor: number | null;
};

function computeTotalAbrigosForDate(rows: AbrigosRow[], date: string): number {
  const totalRow = rows.find((r) => r.data === date && isTotalLabel(r.modalidade));
  if (totalRow && typeof totalRow.valor === "number") return totalRow.valor;

  return rows
    .filter((r) => r.data === date && r.modalidade && !isTotalLabel(r.modalidade))
    .reduce((acc, r) => acc + (typeof r.valor === "number" ? r.valor : 0), 0);
}

type AlfRow = {
  territorio: string;
  data: string;
  categoria: string;
  valor: number | null;
};

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
  const [kpiAcolhidosDetails, setKpiAcolhidosDetails] = useState<string[]>([]);

  const [kpiUnidades, setKpiUnidades] = useState<number | null>(null);
  const [kpiUnidadesDetails, setKpiUnidadesDetails] = useState<string[]>([]);

  // ✅ Alfabetização: número e percentual
  const [kpiNaoAlfabetizados, setKpiNaoAlfabetizados] = useState<number | null>(null);
  const [kpiNaoAlfabetizadosPct, setKpiNaoAlfabetizadosPct] = useState<number | null>(null);

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  // Catálogo
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

  // KPI Acolhidos (sem evolução; com breakdown; com agrupamento "Abrigos")
  useEffect(() => {
    getIndicadorSheet("acolhidos")
      .then((d) => {
        const values: any[][] = d.values || [];
        if (values.length < 2) {
          setKpiAcolhidos(null);
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

        if (!last) {
          setKpiAcolhidos(null);
          setKpiAcolhidosDetails([]);
          return;
        }

        const lastTotal = computeTotalForDate(rj, last);
        setKpiAcolhidos(Number.isFinite(lastTotal) ? lastTotal : null);

        const rowsLast = rj.filter((x) => x.data === last);

        const byMod = new Map<string, number>();
        rowsLast.forEach((r) => {
          const mod = (r.modalidade || "").trim();
          if (!mod) return;
          if (isTotalLabel(mod)) return;

          const v = typeof r.valor === "number" ? r.valor : 0;
          if (!Number.isFinite(v) || v <= 0) return;

          const grouped = groupModalidade(mod);
          byMod.set(grouped, (byMod.get(grouped) || 0) + v);
        });

        const order = ["Abrigos", "Famílias Acolhedoras", "Acolhimento Especializado em Dependentes Químicos", "Acolhimentos de Segunda à Sexta", "Acolhimento para Aluno Residente"];

        const lines: string[] = [];
        order.forEach((mod) => {
          const grouped = groupModalidade(mod);
          const v = byMod.get(grouped);
          if (typeof v === "number" && v > 0) {
            lines.push(`${labelModalidade(grouped)}: ${v.toLocaleString("pt-BR")}`);
          }
        });

        Array.from(byMod.entries())
          .filter(([mod]) => !order.map(groupModalidade).includes(mod))
          .sort((a, b) => b[1] - a[1])
          .forEach(([mod, v]) => {
            if (v > 0) lines.push(`${labelModalidade(mod)}: ${v.toLocaleString("pt-BR")}`);
          });

        setKpiAcolhidosDetails(lines);
      })
      .catch(() => {
        setKpiAcolhidos(null);
        setKpiAcolhidosDetails([]);
      });
  }, []);

  // KPI Entidades (abrigos) com agrupamento "Abrigos"
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

        const byMod = new Map<string, number>();
        rowsLast.forEach((r) => {
          const mod = (r.modalidade || "").trim();
          if (!mod) return;
          if (isTotalLabel(mod)) return;

          const v = typeof r.valor === "number" ? r.valor : 0;
          if (!Number.isFinite(v) || v <= 0) return;

          const grouped = groupModalidade(mod);
          byMod.set(grouped, (byMod.get(grouped) || 0) + v);
        });

        const order = ["Abrigos", "Famílias Acolhedoras", "Acolhimento Especializado em Dependentes Químicos", "Acolhimentos de Segunda à Sexta", "Acolhimento para Aluno Residente"];

        const lines: string[] = [];
        order.forEach((mod) => {
          const grouped = groupModalidade(mod);
          const v = byMod.get(grouped);
          if (typeof v === "number" && v > 0) {
            lines.push(`${labelModalidade(grouped)}: ${v.toLocaleString("pt-BR")}`);
          }
        });

        Array.from(byMod.entries())
          .filter(([mod]) => !order.map(groupModalidade).includes(mod))
          .sort((a, b) => b[1] - a[1])
          .forEach(([mod, v]) => {
            if (v > 0) lines.push(`${labelModalidade(mod)}: ${v.toLocaleString("pt-BR")}`);
          });

        setKpiUnidadesDetails(lines);
      })
      .catch(() => {
        setKpiUnidades(null);
        setKpiUnidadesDetails([]);
      });
  }, []);

  // KPI Alfabetização: não alfabetizados + percentual (no último período do RJ)
  useEffect(() => {
    getIndicadorSheet("alfabetizacao")
      .then((d) => {
        const values: any[][] = d.values || [];
        if (values.length < 2) {
          setKpiNaoAlfabetizados(null);
          setKpiNaoAlfabetizadosPct(null);
          return;
        }

        const headers = values[0].map((x) => String(x ?? "").trim().toLowerCase());
        const body = values.slice(1);

        const idxTerritorio = headers.indexOf("territorio");
        const idxData = headers.indexOf("data");
        const idxValor = headers.indexOf("valor");

        let idxCategoria = headers.indexOf("categoria");
        if (idxCategoria < 0) idxCategoria = headers.indexOf("alfabetizacao");
        if (idxCategoria < 0) idxCategoria = headers.indexOf("condicao");
        if (idxCategoria < 0) idxCategoria = headers.indexOf("situacao");

        if (idxTerritorio < 0 || idxData < 0 || idxValor < 0 || idxCategoria < 0) {
          setKpiNaoAlfabetizados(null);
          setKpiNaoAlfabetizadosPct(null);
          return;
        }

        let lastDateAny = "";
        const parsed: AlfRow[] = body.map((r) => {
          const rawDate = String(r[idxData] ?? "").trim();
          if (rawDate) lastDateAny = rawDate;

          return {
            territorio: String(r[idxTerritorio] ?? "").trim(),
            data: rawDate || lastDateAny,
            categoria: String(r[idxCategoria] ?? "").trim(),
            valor: parseNumberOrNull(r[idxValor]),
          };
        });

        const rj = parsed.filter((x) => x.territorio === "RJ");
        const dates = Array.from(new Set(rj.map((x) => x.data).filter(Boolean))).sort();
        const last = dates[dates.length - 1];

        if (!last) {
          setKpiNaoAlfabetizados(null);
          setKpiNaoAlfabetizadosPct(null);
          return;
        }

        const rowsLast = rj.filter((x) => x.data === last);

        const nao = rowsLast.find((r) => {
          const c = normTxt(r.categoria);
          return c.includes("nao") && c.includes("alfabet");
        });

        const naoVal = nao && typeof nao.valor === "number" ? nao.valor : null;
        setKpiNaoAlfabetizados(naoVal);

        // total: tenta “em todos os acolhimentos”/“todos”, senão soma tudo
        const totalRow = rowsLast.find((r) => isTotalLabel(r.categoria));
        const totalVal =
          totalRow && typeof totalRow.valor === "number"
            ? totalRow.valor
            : rowsLast.reduce((acc, r) => acc + (typeof r.valor === "number" ? r.valor : 0), 0);

        if (typeof naoVal === "number" && totalVal > 0) {
          const pct = (naoVal / totalVal) * 100;
          setKpiNaoAlfabetizadosPct(Math.round(pct * 10) / 10);
        } else {
          setKpiNaoAlfabetizadosPct(null);
        }
      })
      .catch(() => {
        setKpiNaoAlfabetizados(null);
        setKpiNaoAlfabetizadosPct(null);
      });
  }, []);

  const KPI_BASE = [
    { id: "total_acolhidos", label: "Crianças e adolescentes acolhidos", value: null, unit: "" },
    { id: "total_unidades", label: "Entidades de acolhimento", value: null, unit: "" },
    { id: "nao_alfabetizados", label: "Não alfabetizados", value: null, unit: "" },
    { id: "tempo_medio", label: "Tempo médio de acolhimento", value: null, unit: "anos" },
  ];

  const kpiData = useMemo(() => {
    return KPI_BASE.map((kpi) => {
      if (kpi.id === "total_acolhidos") {
        return {
          ...kpi,
          value: typeof kpiAcolhidos === "number" ? kpiAcolhidos : null,
          details: kpiAcolhidosDetails,
          // ✅ removido: change / changeLabel
        };
      }

      if (kpi.id === "total_unidades") {
        return {
          ...kpi,
          value: typeof kpiUnidades === "number" ? kpiUnidades : null,
          details: kpiUnidadesDetails,
        };
      }

      if (kpi.id === "nao_alfabetizados") {
        const v = typeof kpiNaoAlfabetizados === "number" ? kpiNaoAlfabetizados : null;
        const pct = typeof kpiNaoAlfabetizadosPct === "number" ? kpiNaoAlfabetizadosPct : null;

        return {
          ...kpi,
          value: v ?? null,
          unit: "",
          details: pct != null ? [`${pct.toLocaleString("pt-BR")}% do total`] : [],
        };
      }

      return { ...kpi, value: null };
    });
  }, [
    kpiAcolhidos,
    kpiAcolhidosDetails,
    kpiUnidades,
    kpiUnidadesDetails,
    kpiNaoAlfabetizados,
    kpiNaoAlfabetizadosPct,
  ]);

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