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

  // aceita "12,3" e "12.3"
  const cleaned = s.replace(/\./g, "").replace(",", "."); // remove milhar com "." e troca "," por "."
  const n = Number(cleaned);
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

// ===== Alfabetização (percentual não alfabetizados) =====
type AlfRow = {
  territorio: string;
  data: string;
  categoria: string;
  valor: number | null;
};

function normTxt(s: unknown) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isRJ(territorio: string) {
  const t = normTxt(territorio);
  return t === "rj" || t.includes("rio de janeiro");
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
  const [kpiAcolhidosDetails, setKpiAcolhidosDetails] = useState<string[]>([]);

  const [kpiUnidades, setKpiUnidades] = useState<number | null>(null);
  const [kpiUnidadesDetails, setKpiUnidadesDetails] = useState<string[]>([]);

  // ✅ percentual de NÃO alfabetizados (mostra só isso no card)
  const [kpiNaoAlfabetizadosPct, setKpiNaoAlfabetizadosPct] = useState<number | null>(null);

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

  // 2) KPI (acolhidos): total RJ + breakdown por modalidade
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

        // cálculo mantido (não exibido no card)
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

  // 3) KPI (abrigos): total RJ + breakdown por modalidade
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

  // ✅ 4) KPI (alfabetizacao): calcula % não alfabetizados no RJ no último período
  useEffect(() => {
    getIndicadorSheet("alfabetizacao")
      .then((d) => {
        const values: any[][] = d.values || [];
        if (values.length < 2) {
          setKpiNaoAlfabetizadosPct(null);
          return;
        }

        const rawHeaders = (values[0] || []).map((x) => String(x ?? "").trim());
        const headersNorm = rawHeaders.map((h) => normTxt(h));
        const body = values.slice(1);

        const idxTerritorio = headersNorm.indexOf("territorio");
        const idxData = headersNorm.indexOf("data");
        const idxValor = headersNorm.indexOf("valor");

        // tenta vários nomes pra coluna de categoria
        const catCandidates = ["categoria", "alfabetizacao", "situacao", "situação", "condicao", "condição"];
        let idxCategoria = -1;
        for (const c of catCandidates) {
          const i = headersNorm.indexOf(normTxt(c));
          if (i >= 0) {
            idxCategoria = i;
            break;
          }
        }

        if (idxTerritorio < 0 || idxData < 0 || idxValor < 0 || idxCategoria < 0) {
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

        const rj = parsed.filter((x) => isRJ(x.territorio));
        const dates = Array.from(new Set(rj.map((x) => x.data).filter(Boolean))).sort();
        const last = dates[dates.length - 1];

        if (!last) {
          setKpiNaoAlfabetizadosPct(null);
          return;
        }

        const rowsLast = rj.filter((x) => x.data === last);

       const naoRow = rowsLast.find((r) => {
  const c = normTxt(r.categoria);
  return c === "nao alfabetizado" || (c.includes("nao") && c.includes("alfabet"));
});

        const nao = naoRow && typeof naoRow.valor === "number" ? naoRow.valor : null;

        const total = rowsLast.reduce((acc, r) => {
          const v = typeof r.valor === "number" ? r.valor : 0;
          return acc + (Number.isFinite(v) ? v : 0);
        }, 0);

        if (typeof nao === "number" && total > 0) {
          const pct = (nao / total) * 100;
          setKpiNaoAlfabetizadosPct(Number.isFinite(pct) ? pct : null);
        } else {
          setKpiNaoAlfabetizadosPct(null);
        }
      })
      .catch(() => {
        setKpiNaoAlfabetizadosPct(null);
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
      id: "nao_alfabetizados",
      label: "Não alfabetizados",
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
        const pct =
          typeof kpiNaoAlfabetizadosPct === "number"
            ? Math.round(kpiNaoAlfabetizadosPct * 10) / 10
            : null;

        return {
          ...kpi,
         value: pct != null ? pct : null,
          details: [],
        };
      }

      return { ...kpi, value: null };
    });
  }, [
    kpiAcolhidos,
    kpiAcolhidosDetails,
    kpiAcolhidosChangePct,
    kpiUnidades,
    kpiUnidadesDetails,
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