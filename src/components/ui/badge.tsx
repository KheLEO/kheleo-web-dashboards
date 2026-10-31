import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export function Badge({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border border-primary/25 bg-primary/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary",
        className,
      )}
      {...props}
    />
  );
}
