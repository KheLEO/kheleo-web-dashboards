import type { ComponentProps } from "react";
export function Label(props: ComponentProps<"label">) {
  return <label className="field" {...props} />;
}
