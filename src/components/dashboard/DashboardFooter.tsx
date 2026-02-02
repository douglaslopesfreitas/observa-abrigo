import { useEffect, useState } from "react";
import { getUpdatedAt } from "@/services/sheetsApi";

export function DashboardFooter() {
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    getUpdatedAt()
      .then((iso) => {
        const d = new Date(iso);
        const fmt = new Intl.DateTimeFormat("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(d);
        setUpdatedAt(fmt);
      })
      .catch((e) => {
        setError(e?.message || "Erro ao buscar atualização");
      });
  }, []);

  return (
    <div className="container max-w-7xl mx-auto px-4 pb-6 pt-2">
      <div className="text-xs text-muted-foreground">
        {updatedAt ? (
          <>
            <strong>Atualizado em:</strong> {updatedAt}
          </>
        ) : error ? (
          <>Atualizado em: indisponível</>
        ) : (
          <>Atualizado em: carregando...</>
        )}
      </div>
    </div>
  );
}
