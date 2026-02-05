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

type CatalogRow = {
  area?: string;
  indicador_id?: string;
  indicador_nome?: string;
  fonte?: string;
  territorio_nome?: string;
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

  const territorios = useMemo<string[]>(() => {
    if (!filters.indicador) return [];
    const rows = catalog.filter((r) => normStr(r.indicador_id) === filters.indicador);
    const rows2 = filters.fonte
      ? rows.filter((r) => normStr(r.fonte) === filters.fonte)
      : rows;

    const fromCatalog = uniq(rows2.map((r) => normStr((r as any).territorio_nome)));
    const all = fromCatalog.length ? fromCatalog : ["RJ"];

    if (!territorioSearch) return all;
    const q = territorioSearch.toLowerCase();
    return all.filter((t) => t.toLowerCase().includes(q));
  }, [catalog, filters.indicador, filters.fonte, territorioSearch]);

  // Efeitos de Auto-seleção
  useEffect(() => {
    if (indicadores.length === 1 && !filters.indicador) {
      onFilterChange({ ...filters, indicador: indicadores[0].id });
    }
  }, [indicadores, filters, onFilterChange]);

  useEffect(() => {
    if (fontes.length === 1 && filters.fonte !== fontes[0]) {
      onFilterChange({ ...filters, fonte: fontes[0], territorio: null });
    }
    if (fontes.length > 1 && filters.fonte && !fontes.includes(filters.fonte)) {
      onFilterChange({ ...filters, fonte: null, territorio: null });
    }
  }, [fontes, filters, onFilterChange]);

  useEffect(() => {
    if (territorios.length === 1 && !filters.territorio) {
      onFilterChange({ ...filters, territorio: territorios[0] });
    }
  }, [territorios, filters, onFilterChange]);

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
    onFilterChange({ ...filters, fonte: value, territorio: null });
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

      {/* ✅ Grid de 12 colunas para controle fino dos tamanhos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* 1. ÁREA - 2 colunas */}
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

        {/* 2. INDICADOR - 3 colunas */}
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

        {/* 3. FONTE - 4 colunas (MAIOR) ✅ */}
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

        {/* 4. TERRITÓRIO - 2 colunas (menor) ✅ */}
        <div className="lg:col-span-2">
          <label className="filter-label">Território</label>
          <Select
            value={filters.territorio || ""}
            onValueChange={handleTerritorioChange}
            disabled={!filters.indicador}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={!filters.indicador ? "Selecione o indicador" : "Selecione"} />
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

        {/* 5. BOTÃO LIMPAR - 1 coluna (alinhado ao final) ✅ */}
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