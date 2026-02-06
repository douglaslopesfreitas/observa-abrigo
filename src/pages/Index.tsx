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
  const cleaned = s.replace(/\./g, "").replace(",", ".");
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
    .filter((r) => r.data === date && r.modalidade && r.modalidade !== "Em todos os acolhimentos")
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
    .filter((r) => r.data === date && r.modalidade && r.modalidade !== "Todos os acolhimentos" && r.modalidade !== "Em todos os acolhimentos")
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

// ===== KPI SIM/NÃO genérico (violência e psicologia) =====
type YnRow = {
  territorio: string;
  data: string;
  resposta: string;
  valor: number | null;
};

function normalizeHeaderKey(h: unknown): string {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function findCategoryColumn(headersKey: string[]) {
  const blocked = new Set(["territorio", "data", "valor", "fonte"]);
  for (let i = 0; i < headersKey.length; i++) {
    const h = headersKey[i];
    if (!h) continue;
    if (blocked.has(h)) continue;
    return i;
  }
  return -1;
}

function calcPctFromYesNo(rows: YnRow[], target: "sim" | "nao") {
  const total = rows.reduce((acc, r) => acc + (typeof r.valor === "number" ? r.valor : 0), 0);
  if (!total || total <= 0) return null;
  const match = rows.find((r) => {
    const t = normTxt(r.resposta);
    if (target === "sim") return t === "sim";
    return t === "nao" || t === "não";
  });
  const v = match && typeof match.valor === "number" ? match.valor : 0;
  const pct = (v / total) * 100;
  return Number.isFinite(pct) ? pct : null;
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

  // ✅ percentual de NÃO alfabetizados
  const [kpiNaoAlfabetizadosPct, setKpiNaoAlfabetizadosPct] = useState<number | null>(null);

  // ✅ Outros KPIs
  const [kpiVitimasViolenciaPct, setKpiVitimasViolenciaPct] = useState<number | null>(null);
  const [kpiSemPsicoPct, setKpiSemPsicoPct] = useState<number | null>(null);

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  // 1) Carrega catálogo
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

  // 2) KPI (acolhidos)
  useEffect(() => {
    getIndicadorSheet("acolhidos")
      .then((d) => {
        const values: any[][] = d.values || [];
        if (values.length < 2) return;
        const headers = values[0].map((x) => String(x ?? "").trim().toLowerCase());
        const body = values.slice(1);
        const idxTerritorio = headers.indexOf("territorio");
        const idxData = headers.indexOf("data");
        const idxModalidade = headers.indexOf("modalidade");
        const idxValor = headers.indexOf("valor");

        if (idxTerritorio < 0 || idxData < 0 || idxModalidade < 0 || idxValor < 0) return;

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
        if (!last) return;

        const lastTotal = computeTotalForDate(rj, last);
        setKpiAcolhidos(Number.isFinite(lastTotal) ? lastTotal : null);

        const rowsLast = rj.filter((x) => x.data === last);
        const byMod = new Map<string, number>();
        rowsLast.forEach((r) => {
          const mod = (r.modalidade || "").trim();
          if (!mod || mod === "Em todos os acolhimentos") return;
          const v = typeof r.valor === "number" ? r.valor : 0;
          if (v > 0) byMod.set(mod, (byMod.get(mod) || 0) + v);
        });

        const order = ["Acolhimento Institucional", "Famílias Acolhedoras", "Casa-Lar"];
        const lines: string[] = [];
        order.forEach((mod) => {
          const v = byMod.get(mod);
          if (v) lines.push(`${shortModalidadeLabel(mod)}: ${v.toLocaleString("pt-BR")}`);
        });
        setKpiAcolhidosDetails(lines);
      })
      .catch(() => {});
  }, []);

  // 3) KPI (unidades/abrigos)
  useEffect(() => {
    getIndicadorSheet("abrigos")
      .then((d) => {
        const values: any[][] = d.values || [];
        if (values.length < 2) return;
        const headers = values[0].map((x) => String(x ?? "").trim().toLowerCase());
        const body = values.slice(1);
        const idxTerritorio = headers.indexOf("territorio");
        const idxData = headers.indexOf("data");
        const idxModalidade = headers.indexOf("modalidade");
        const idxValor = headers.indexOf("valor");

        if (idxTerritorio < 0 || idxData < 0 || idxModalidade < 0 || idxValor < 0) return;

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
        if (!last) return;

        const lastTotal = computeTotalAbrigosForDate(rj, last);
        setKpiUnidades(Number.isFinite(lastTotal) ? lastTotal : null);

        const rowsLast = rj.filter((x) => x.data === last);
        const lines: string[] = [];
        const order = ["Acolhimento Institucional", "Famílias Acolhedoras", "Casa-Lar"];
        
        const byMod = new Map<string, number>();
        rowsLast.forEach((r) => {
          const mod = (r.modalidade || "").trim();
          if (!mod || mod.includes("todos")) return;
          const v = typeof r.valor === "number" ? r.valor : 0;
          if (v > 0) byMod.set(mod, (byMod.get(mod) || 0) + v);
        });

        order.forEach((mod) => {
          const v = byMod.get(mod);
          if (v) lines.push(`${shortModalidadeLabel(mod)}: ${v}`);
        });
        setKpiUnidadesDetails(lines);
      })
      .catch(() => {});
  }, []);

  // 4) ✅ KPI (educacao): Calcula % de não alfabetizados somando o total da aba educacao
  useEffect(() => {
    getIndicadorSheet("educacao") // Alterado para buscar da aba "educacao"
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

        // Identifica a coluna que diz "Alfabetizado" ou "Não Alfabetizado"
        const catCandidates = ["categoria", "alfabetizacao", "alfabetização", "situacao", "situação"];
        let idxCategoria = -1;
        for (const c of catCandidates) {
          const i = headersNorm.indexOf(normTxt(c));
          if (i >= 0) { idxCategoria = i; break; }
        }

        if (idxTerritorio < 0 || idxData < 0 || idxValor < 0 || idxCategoria < 0) {
          console.warn("Colunas não encontradas na aba educacao. Verifique os cabeçalhos.");
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

        // SOMAR TUDO (Total de crianças 8+ na planilha)
        const totalAba = rowsLast.reduce((acc, r) => {
          const v = typeof r.valor === "number" ? r.valor : 0;
          return acc + v;
        }, 0);

        // Encontrar a linha dos NÃO alfabetizados
        const naoRow = rowsLast.find((r) => {
          const c = normTxt(r.categoria);
          return c.includes("nao") && c.includes("alfabet");
        });

        const valorNao = naoRow && typeof naoRow.valor === "number" ? naoRow.valor : 0;

        if (totalAba > 0) {
          const pct = (valorNao / totalAba) * 100;
          setKpiNaoAlfabetizadosPct(Number.isFinite(pct) ? pct : null);
        } else {
          setKpiNaoAlfabetizadosPct(null);
        }
      })
      .catch((err) => {
        console.error("Erro na aba educacao:", err);
        setKpiNaoAlfabetizadosPct(null);
      });
  }, []);

  // 5) KPI Violência
  useEffect(() => {
    getIndicadorSheet("violencia")
      .then((d) => {
        const values: any[][] = d.values || [];
        if (values.length < 2) return;
        const headersKey = (values[0] || []).map(normalizeHeaderKey);
        const idxTerr = headersKey.indexOf("territorio");
        const idxData = headersKey.indexOf("data");
        const idxVal = headersKey.indexOf("valor");
        const idxCat = findCategoryColumn(headersKey);
        if (idxTerr < 0 || idxData < 0 || idxVal < 0 || idxCat < 0) return;

        const body = values.slice(1);
        let lastDateAny = "";
        const parsed: YnRow[] = body.map((r) => {
          const rawDate = String(r[idxData] ?? "").trim();
          if (rawDate) lastDateAny = rawDate;
          return {
            territorio: String(r[idxTerr] ?? "").trim(),
            data: rawDate || lastDateAny,
            resposta: String(r[idxCat] ?? "").trim(),
            valor: parseNumberOrNull(r[idxVal]),
          };
        });

        const rj = parsed.filter((x) => isRJ(x.territorio));
        const dates = Array.from(new Set(rj.map((x) => x.data).filter(Boolean))).sort();
        const last = dates[dates.length - 1];
        if (last) {
          setKpiVitimasViolenciaPct(calcPctFromYesNo(rj.filter(x => x.data === last), "sim"));
        }
      })
      .catch(() => {});
  }, []);

  // 6) KPI Psicologia
  useEffect(() => {
    const trySheets = async () => {
      const candidates = ["psicologico", "psicologia", "saude"];
      for (const sheet of candidates) {
        try {
          const d = await getIndicadorSheet(sheet);
          const values: any[][] = d.values || [];
          if (values.length < 2) continue;
          const headersKey = (values[0] || []).map(normalizeHeaderKey);
          const idxTerr = headersKey.indexOf("territorio");
          const idxData = headersKey.indexOf("data");
          const idxVal = headersKey.indexOf("valor");
          const idxCat = findCategoryColumn(headersKey);
          if (idxTerr < 0 || idxData < 0 || idxVal < 0 || idxCat < 0) continue;

          const body = values.slice(1);
          let lastDateAny = "";
          const parsed: YnRow[] = body.map((r) => {
            const rawDate = String(r[idxData] ?? "").trim();
            if (rawDate) lastDateAny = rawDate;
            return {
              territorio: String(r[idxTerr] ?? "").trim(),
              data: rawDate || lastDateAny,
              resposta: String(r[idxCat] ?? "").trim(),
              valor: parseNumberOrNull(r[idxVal]),
            };
          });

          const rj = parsed.filter((x) => isRJ(x.territorio));
          const dates = Array.from(new Set(rj.map((x) => x.data).filter(Boolean))).sort();
          const last = dates[dates.length - 1];
          if (last) {
            setKpiSemPsicoPct(calcPctFromYesNo(rj.filter(x => x.data === last), "nao"));
            return;
          }
        } catch {}
      }
    };
    trySheets();
  }, []);

  const KPI_BASE = [
    { id: "total_acolhidos", label: "Crianças e adolescentes acolhidos", value: null, unit: "" },
    { id: "total_unidades", label: "Entidades de acolhimento", value: null, unit: "" },
    { id: "nao_alfabetizados", label: "Não alfabetizados", value: null, unit: "" },
    { id: "vitimas_violencia", label: "Vítimas de violência", value: null, unit: "" },
    { id: "sem_psico", label: "Sem acompanhamento psicológico individualizado", value: null, unit: "" },
  ];

  const kpiData = useMemo(() => {
    return KPI_BASE.map((kpi) => {
      if (kpi.id === "total_acolhidos") {
        return { ...kpi, value: kpiAcolhidos, details: kpiAcolhidosDetails };
      }
      if (kpi.id === "total_unidades") {
        return { ...kpi, value: kpiUnidades, details: kpiUnidadesDetails };
      }
      if (kpi.id === "nao_alfabetizados") {
        const pct = typeof kpiNaoAlfabetizadosPct === "number" ? Math.round(kpiNaoAlfabetizadosPct * 10) / 10 : null;
        return { 
          ...kpi, 
          value: pct != null ? `${pct.toLocaleString("pt-BR")}%` : null,
          details: ["Entre crianças e adolescentes acolhidos que já deveriam estar alfabetizados (8+)"] 
        };
      }
      if (kpi.id === "vitimas_violencia") {
        const pct = typeof kpiVitimasViolenciaPct === "number" ? Math.round(kpiVitimasViolenciaPct * 10) / 10 : null;
        return { ...kpi, value: pct != null ? `${pct.toLocaleString("pt-BR")}%` : null };
      }
      if (kpi.id === "sem_psico") {
        const pct = typeof kpiSemPsicoPct === "number" ? Math.round(kpiSemPsicoPct * 10) / 10 : null;
        return { ...kpi, value: pct != null ? `${pct.toLocaleString("pt-BR")}%` : null };
      }
      return { ...kpi, value: null };
    });
  }, [kpiAcolhidos, kpiAcolhidosDetails, kpiUnidades, kpiUnidadesDetails, kpiNaoAlfabetizadosPct, kpiVitimasViolenciaPct, kpiSemPsicoPct]);

  const hasActiveFilters = Boolean(filters.area || filters.indicador);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />
      <main className="flex-1 container max-w-7xl mx-auto py-6 space-y-6">
        <section>
          <h2 className="section-title px-1">Visão Geral do Acolhimento | Estado do Rio de Janeiro</h2>
          <KPICards data={kpiData as any} />
        </section>
        <section><OverviewCharts /></section>
        <section className="pt-4">
          {catalogoLoading ? <div className="text-sm text-muted-foreground">Carregando catálogo...</div> : null}
          <FilterSection filters={filters} onFilterChange={handleFilterChange} catalogo={catalogo as any} />
        </section>
        {hasActiveFilters && (
          <section><IndicatorResults filters={filters} catalogo={catalogo} /></section>
        )}
        <section className="pt-2"><LastUpdated /></section>
      </main>
    </div>
  );
}