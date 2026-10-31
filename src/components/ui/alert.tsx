import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
export function Alert({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return (
    <div
      role={danger ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${danger ? "border-destructive/50 bg-destructive/10" : "border-primary/30 bg-primary/5"}`}
    >
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
