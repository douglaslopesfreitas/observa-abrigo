import { cn } from "@/lib/utils";
import { Users, Building2, BookOpen, ShieldAlert, Brain } from "lucide-react";

type KPI = {
  id: string;
  label: string;
  value: any;
  unit?: string;
  details?: string[];
  change?: number;
  changeLabel?: string;
};

export function KPICards({ data }: { data: KPI[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {data.map((kpi, index) => {
        const isPrimary = index === 0;

        return (
          <div
            key={kpi.id}
            className={cn(
              "rounded-2xl border bg-card shadow-sm transition-colors",
              // compacta um pouco
              "p-4",
              isPrimary && "bg-gradient-to-br from-[#359AD4] to-[#175070] text-white border-transparent"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div
                  className={cn(
                    "font-medium leading-tight",
                    // menor pra caber 5
                    "text-[13px]",
                    isPrimary ? "text-white/90" : "text-muted-foreground"
                  )}
                >
                  {kpi.label}
                </div>

                <div className={cn("mt-2 flex items-end gap-2")}>
                  <div className={cn("font-semibold leading-none", "text-3xl")}>
                    {kpi.value ?? "—"}
                  </div>
                  {kpi.unit ? (
                    <div className={cn("pb-1 text-sm", isPrimary ? "text-white/85" : "text-muted-foreground")}>
                      {kpi.unit}
                    </div>
                  ) : null}
                </div>

                {Array.isArray(kpi.details) && kpi.details.length > 0 ? (
                  <div className={cn("mt-2 space-y-1", isPrimary ? "text-white/85" : "text-muted-foreground")}>
                    {kpi.details.map((d, i) => (
                      <div key={i} className="text-10x leading-snug">
                        {d}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className={cn(isPrimary ? "text-white/90" : "text-muted-foreground")}>
                <KPIIcon id={kpi.id} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KPIIcon({ id }: { id: string }) {
  // ícones específicos pros seus 5 cards
  if (id === "total_acolhidos") return <Users className="h-5 w-5" />;
  if (id === "total_unidades") return <Building2 className="h-5 w-5" />;
  if (id === "nao_alfabetizados") return <BookOpen className="h-5 w-5" />;
  if (id === "vitimas_violencia") return <ShieldAlert className="h-5 w-5" />;
  if (id === "sem_psico") return <Brain className="h-5 w-5" />;

  return <Users className="h-5 w-5" />;
}