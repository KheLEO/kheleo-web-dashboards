import Link from "next/link";
import { Shield, Sparkles } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const logoBadgeVariants = cva(
  "relative flex items-center justify-center rounded-xl font-black shadow-md transition-all duration-300",
  {
    variants: {
      size: {
        sm: "h-8 w-8 text-sm",
        md: "h-10 w-10 text-base",
        lg: "h-14 w-14 text-xl",
      },
      glow: {
        true: "border border-primary/60 shadow-[0_0_18px_-2px_rgba(245,176,20,0.45)]",
        false: "border border-border",
      },
    },
    defaultVariants: {
      size: "md",
      glow: true,
    },
  },
);

const textVariants = cva("font-bold tracking-tight", {
  variants: {
    size: {
      sm: "text-lg",
      md: "text-xl",
      lg: "text-3xl",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface BrandLogoProps extends VariantProps<typeof logoBadgeVariants> {
  href?: string | null;
  showTagline?: boolean;
  className?: string;
}

export function BrandLogo({
  size = "md",
  glow = true,
  href = "/",
  showTagline = true,
  className,
}: BrandLogoProps) {
  const content = (
    <div className={cn("inline-flex items-center gap-3 select-none group", className)}>
      <div className={logoBadgeVariants({ size, glow })}>
        <span className="absolute inset-0 rounded-xl bg-metallic-gold opacity-90 transition-opacity group-hover:opacity-100" />
        <span className="absolute inset-0.5 rounded-[10px] bg-kheleo-surface/90 backdrop-blur-sm" />
        <div className="relative z-10 flex items-center justify-center text-primary">
          <Shield
            className={cn(
              size === "sm" && "h-4 w-4",
              size === "md" && "h-5 w-5",
              size === "lg" && "h-8 w-8",
            )}
            strokeWidth={2.4}
          />
          <Sparkles
            className={cn(
              "absolute -top-1 -right-1 text-kheleo-crimson-primary animate-pulse",
              size === "sm" && "h-2.5 w-2.5",
              size === "md" && "h-3 w-3",
              size === "lg" && "h-4 w-4",
            )}
          />
        </div>
      </div>

      <div className="flex flex-col">
        <span className={cn(textVariants({ size }), "text-kheleo-silver-chrome")}>
          Khe<span className="text-primary font-black">LEO</span>
        </span>
        {showTagline && size !== "sm" && (
          <span className="text-[9px] font-semibold uppercase tracking-[0.24em] text-kheleo-silver-muted">
            Potential. Unlocked.
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}
