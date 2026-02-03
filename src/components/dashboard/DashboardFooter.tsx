import { useEffect, useState } from "react";
import { getUpdatedAt } from "@/services/sheetsApi";

export function DashboardFooter() {
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    getUpdatedAt()
      .then((d) => setUpdatedAt(d))
      .catch(() => setUpdatedAt(null));
  }, []);

  return (
    <footer className="mt-10 border-t py-4 text-xs text-muted-foreground">
      {updatedAt ? (
        <span>Última atualização: {updatedAt}</span>
      ) : (
        <span>Atualização indisponível</span>
      )}
    </footer>
  );
}