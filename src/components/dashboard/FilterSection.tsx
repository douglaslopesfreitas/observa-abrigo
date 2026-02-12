import { useEffect, useMemo, useState } from "react";
import { Search, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { FilterState } from "@/types/dashboard";
import { getIndicador } from "@/services/sheetsApi";

type CatalogRow = {
  area?: string;
  indicador_id?: string;
  indicador_nome?: string;
  fonte?: string;
  territorio?: string;
  sheet?: string; 
  range?: string; 
};

interface FilterSectionProps {
  onFilterChange: (filters: FilterState) => void;
  filters: FilterState;
  catalogo?: CatalogRow[];
}

type AreaOption = { id: string; nome: string };
type IndicadorOption = { id: string; nome: string };

function normStr(v: unknown) {
  return String(v ?? "").trim();
}
function uniq(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

export function FilterSection({ onFilterChange, filters, catalogo }: FilterSectionProps) {
  const [territorioSearch, setTerritorioSearch] = useState("");
  const [dynamicTerritorios, setDynamicTerritorios] = useState<string[]>([]);
  const [loadingTerritorios, setLoadingTerritorios] = useState(false);

  const catalog = useMemo<CatalogRow[]>(
    () => (Array.isArray(catalogo) ? catalogo : []),
    [catalogo]
  );

  const areas = useMemo<AreaOption[]>(() => {
    const list = uniq(catalog.map((r) => normStr(r.area))).map((nome) => ({
      id: nome.toLowerCase().replace(/\s+/g, "_"),
      nome,
    }));
    return list;
  }, [catalog]);

  const indicadores = useMemo<IndicadorOption[]>(() => {
    if (!filters.area) return [];
    const rows = catalog.filter((r) => normStr(r.area) === filters.area);
    const map = new Map<string, string>();
    rows.forEach((r) => {
      const id = normStr(r.indicador_id);
      const nome = normStr(r.indicador_nome);
      if (id && !map.has(id)) map.set(id, nome || id);
    });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [catalog, filters.area]);

  const fontes = useMemo<string[]>(() => {
    if (!filters.indicador) return [];
    const rows = catalog.filter((r) => normStr(r.indicador_id) === filters.indicador);
    return uniq(rows.map((r) => normStr(r.fonte)));
  }, [catalog, filters.indicador]);

useEffect(() => {
  if (!filters.indicador || !filters.fonte) {
    setDynamicTerritorios([]);
    return;
  }

  const meta = catalog.find(
    (r) =>
      normStr(r.indicador_id) === filters.indicador &&
      normStr(r.fonte) === filters.fonte
  );

  if (!meta?.sheet || !meta?.range) {
    setDynamicTerritorios([]);
    return;
  }

  setLoadingTerritorios(true);

  const sheetRange = `${meta.sheet}!${meta.range}`;

  getIndicador(sheetRange)
    .then((resp) => {
      const vals = resp.values || [];
      if (vals.length < 2) {
        setDynamicTerritorios([]);
        return;
      }

      const headers = (vals[0] || []).map((h) =>
        String(h).trim().toLowerCase()
      );

      const idxTerr = headers.indexOf("territorio");

      if (idxTerr >= 0) {
        const body = vals.slice(1);
        const list = uniq(
          body.map((r) => String(r[idxTerr] || "").trim())
        );
        setDynamicTerritorios(list);
      } else {
        setDynamicTerritorios([]);
      }
    })
    .catch((err) => {
      console.error("Erro ao carregar territórios:", err);
      setDynamicTerritorios([]);
    })
    .finally(() => setLoadingTerritorios(false));
}, [filters.indicador, filters.fonte, catalog]);


  const territorios = useMemo<string[]>(() => {
    if (!filters.indicador) return [];
    
    const list = dynamicTerritorios;

    if (!territorioSearch) return list;
    const q = territorioSearch.toLowerCase();
    return list.filter((t) => t.toLowerCase().includes(q));
  }, [dynamicTerritorios, territorioSearch, filters.indicador]);


  // Efeitos de Auto-seleção
  useEffect(() => {
    if (indicadores.length === 1 && !filters.indicador) {
      onFilterChange({ ...filters, indicador: indicadores[0].id });
    }
  }, [indicadores, filters, onFilterChange]);

  useEffect(() => {
    if (fontes.length === 1 && filters.fonte !== fontes[0]) {
      // ✅ Mudança: Mantemos o filters.territorio em vez de passar null, para não apagar o RJ do clique
      onFilterChange({ ...filters, fonte: fontes[0], territorio: filters.territorio });
    }
    if (fontes.length > 1 && filters.fonte && !fontes.includes(filters.fonte)) {
      onFilterChange({ ...filters, fonte: null, territorio: filters.territorio });
    }
  }, [fontes, filters, onFilterChange]);

  // ✅ AJUSTE REFORÇADO: Gerencia o RJ e evita limpezas indesejadas
  useEffect(() => {
    if (loadingTerritorios) return;

    if (territorios.length === 1) {
      // Se só tem 1 opção (ex: RJ), garante que ela esteja selecionada
      if (normStr(filters.territorio).toLowerCase() !== normStr(territorios[0]).toLowerCase()) {
        onFilterChange({ ...filters, territorio: territorios[0] });
      }
    } 
    else if (territorios.length > 1) {
      // Se tiver várias opções (RJ, Niterói...), verifica se o valor atual é válido na lista nova
      const isCurrentValid = territorios.some(
        (t) => t.toLowerCase() === normStr(filters.territorio).toLowerCase()
      );

      // SÓ limpa se o território atual NÃO existir na lista que veio da planilha
      if (filters.territorio && !isCurrentValid) {
        onFilterChange({ ...filters, territorio: null });
      }
    }
  }, [territorios, loadingTerritorios, filters.territorio]);


  // Handlers
  const handleAreaChange = (value: string) => {
    setTerritorioSearch("");
    onFilterChange({ area: value, indicador: null, fonte: null, territorio: null });
  };

  const handleIndicadorChange = (value: string) => {
    setTerritorioSearch("");
    onFilterChange({ ...filters, indicador: value, fonte: null, territorio: null });
  };

  const handleFonteChange = (value: string) => {
    setTerritorioSearch("");
    onFilterChange({ ...filters, fonte: value, territorio: filters.territorio });
  };

  const handleTerritorioChange = (value: string) => {
    onFilterChange({ ...filters, territorio: value });
  };

  const handleClearFilters = () => {
    setTerritorioSearch("");
    onFilterChange({ area: null, indicador: null, fonte: null, territorio: null });
  };

  const hasFilters = Boolean(filters.area || filters.indicador || filters.fonte || filters.territorio);
  const showFonteFilter = fontes.length > 1;

  const itemClass =
    "data-[highlighted]:bg-[#175070] data-[highlighted]:text-white " +
    "data-[state=checked]:bg-[#359ad4] data-[state=checked]:text-white " +
    "focus:bg-[#175070] focus:text-white";

  return (
    <div className="filter-section animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold text-foreground">Explorar Indicadores</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* 1. ÁREA */}
        <div className="lg:col-span-2">
          <label className="filter-label">Área</label>
          <Select value={filters.area || ""} onValueChange={handleAreaChange}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={areas.length ? "Selecione a área" : "Sem opções"} />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {areas.map((area) => (
                <SelectItem key={area.id} value={area.nome} className={itemClass}>
                  {area.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 2. INDICADOR */}
        <div className="lg:col-span-3">
          <label className="filter-label">Indicador</label>
          <Select
            value={filters.indicador || ""}
            onValueChange={handleIndicadorChange}
            disabled={!filters.area || indicadores.length === 0}
          >
            <SelectTrigger className="bg-background">
              <div className="truncate text-left w-full">
                <SelectValue placeholder={!filters.area ? "Selecione a área primeiro" : "Selecione o indicador"} />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {indicadores.map((ind) => (
                <SelectItem key={ind.id} value={ind.id} className={itemClass}>
                  {ind.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 3. FONTE */}
        <div className="lg:col-span-4">
          <label className="filter-label">Fonte</label>
          {showFonteFilter ? (
            <Select value={filters.fonte || ""} onValueChange={handleFonteChange}>
              <SelectTrigger className="bg-background">
                <div className="truncate text-left w-full">
                  <SelectValue placeholder="Selecione a fonte" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {fontes.map((fonte) => (
                  <SelectItem key={fonte} value={fonte} className={itemClass}>
                    {fonte}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div 
              className="h-10 flex items-center text-sm text-muted-foreground px-3 rounded-md border bg-background truncate cursor-default"
              title={filters.fonte || ""}
            >
              <span className="truncate">
                {filters.fonte ? filters.fonte : !filters.indicador ? "Aguardando indicador" : "Única fonte"}
              </span>
            </div>
          )}
        </div>

        {/* 4. TERRITÓRIO */}
        <div className="lg:col-span-2">
          <label className="filter-label">Território</label>
          <Select
            value={filters.territorio || ""}
            onValueChange={handleTerritorioChange}
            disabled={!filters.indicador || !filters.fonte || loadingTerritorios}

          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={
                loadingTerritorios 
                  ? "Carregando..." 
                  : !filters.indicador 
                    ? "Selecione o indicador" 
                    : "Selecione"
              } />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50 max-h-64">
              <div className="px-2 py-1.5 sticky top-0 bg-popover">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={territorioSearch}
                    onChange={(e) => setTerritorioSearch(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
              </div>
              {territorios.map((terr) => (
                <SelectItem key={terr} value={terr} className={itemClass}>
                  {terr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 5. BOTÃO LIMPAR */}
        <div className="lg:col-span-1">
          <label className="filter-label opacity-0">Ações</label>
          {hasFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="w-full h-10 gap-1.5 hover:bg-[#359ad4] hover:text-white hover:border-[#359ad4]"
            >
              <X className="h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}