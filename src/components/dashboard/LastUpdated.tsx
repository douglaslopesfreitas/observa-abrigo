import { useEffect, useState } from "react";
import { getUpdatedAt } from "@/services/sheetsApi";

function formatDateBR(iso: string) {
  const s = String(iso || "").trim();
  if (!s) return "";
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
}

export function LastUpdated() {
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    getUpdatedAt()
      .then((value) => {
        if (!value) return;
        setUpdatedAt(formatDateBR(value));
      })
      .catch(() => {
        setUpdatedAt(null);
      });
  }, []);

  if (!updatedAt) return null;

  return (
    <div className="mt-3 text-xs text-muted-foreground">
      Atualizado em: <span>{updatedAt}</span>
    </div>
  );
}