import React from "react";
import { TrendingUp, TrendingDown, Users, Building2, GraduationCap, Clock } from "lucide-react";
import type { KPIData } from "@/types/dashboard";
import { cn } from "@/lib/utils";

interface KPICardsProps {
  data: KPIData[];
  loading?: boolean;
}

const iconMap: Record<string, React.ElementType> = {
  total_acolhidos: Users,
  total_unidades: Building2,
  taxa_frequencia: GraduationCap,
  tempo_medio: Clock,
  evolucao_acolhidos: TrendingUp,
};

export function KPICards({ data, loading }: KPICardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="kpi-card">
            <div className="skeleton-pulse h-4 w-20 mb-3" />
            <div className="skeleton-pulse h-8 w-28 mb-2" />
            <div className="skeleton-pulse h-3 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {data.map((kpi, index) => {
        const Icon = iconMap[kpi.id] || Users;
        const isPositive = typeof kpi.change === "number" ? kpi.change > 0 : false;
        const isHighlight = index === 0;

        return (
          <div
            key={kpi.id}
            className={cn("animate-fade-in", isHighlight ? "kpi-card-highlight" : "kpi-card")}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <span
                className={cn(
                  "text-sm font-medium",
                  isHighlight ? "text-primary-foreground/80" : "text-muted-foreground"
                )}
              >
                {kpi.label}
              </span>

              <Icon
                className={cn(
                  "h-5 w-5",
                  isHighlight ? "text-primary-foreground/60" : "text-muted-foreground/60"
                )}
              />
            </div>

            <div
              className={cn(
                "text-2xl md:text-3xl font-bold mb-1",
                isHighlight ? "text-primary-foreground" : "text-foreground"
              )}
            >
              {typeof kpi.value === "number" ? kpi.value.toLocaleString("pt-BR") : kpi.value}
              {kpi.unit ? <span className="text-base font-medium ml-1">{kpi.unit}</span> : null}
            </div>

            {/* ✅ DETALHES (texto miúdo dentro do card) */}
            {kpi.details && kpi.details.length > 0 ? (
              <div
                className={cn(
                  "text-xs leading-snug mt-1",
                  isHighlight ? "text-primary-foreground/70" : "text-muted-foreground"
                )}
              >
                {kpi.details.map((line, i) => (
                  <div key={`${kpi.id}-detail-${i}`}>{line}</div>
                ))}
              </div>
            ) : null}

            {typeof kpi.change === "number" ? (
              <div
                className={cn(
                  "flex items-center gap-1 text-sm mt-2",
                  isHighlight ? "text-primary-foreground/80" : ""
                )}
              >
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-secondary" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}

                <span className={isPositive ? "text-secondary" : "text-destructive"}>
                  {isPositive ? "+" : ""}
                  {kpi.change}%
                </span>

                {kpi.changeLabel ? (
                  <span className={cn(isHighlight ? "text-primary-foreground/60" : "text-muted-foreground")}>
                    {kpi.changeLabel}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
