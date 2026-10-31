import type { ComponentProps } from "react";
export function Table(props: ComponentProps<"table">) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Scrollable data table"
      className="max-w-full overflow-x-auto rounded-lg border"
    >
      <table
        className="w-full border-collapse text-left text-sm [&_td]:border-t [&_td]:px-4 [&_td]:py-3 [&_th]:bg-secondary [&_th]:px-4 [&_th]:py-3 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground"
        {...props}
      />
    </div>
  );
}
