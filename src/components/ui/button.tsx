import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export interface ButtonProps extends ComponentProps<"button"> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  asChild?: boolean;
}
export function Button({ className, variant = "primary", asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        {
          "bg-primary text-primary-foreground hover:bg-accent": variant === "primary",
          "border bg-secondary text-secondary-foreground hover:border-primary":
            variant === "secondary",
          "text-muted-foreground hover:bg-secondary hover:text-foreground": variant === "ghost",
          "bg-destructive text-destructive-foreground": variant === "destructive",
        },
        className,
      )}
      {...props}
    />
  );
}
