import type { Config } from "tailwindcss";

const color = (name: string): string => `rgb(var(--${name}) / <alpha-value>)`;

const config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      background: color("background"),
      foreground: color("foreground"),
      border: color("border"),
      input: color("input"),
      ring: color("ring"),
      card: { DEFAULT: color("card"), foreground: color("card-foreground") },
      popover: { DEFAULT: color("popover"), foreground: color("popover-foreground") },
      primary: { DEFAULT: color("primary"), foreground: color("primary-foreground") },
      secondary: { DEFAULT: color("secondary"), foreground: color("secondary-foreground") },
      muted: { DEFAULT: color("muted"), foreground: color("muted-foreground") },
      accent: { DEFAULT: color("accent"), foreground: color("accent-foreground") },
      destructive: { DEFAULT: color("destructive"), foreground: color("destructive-foreground") },
      success: { DEFAULT: color("success"), foreground: color("success-foreground") },
      warning: { DEFAULT: color("warning"), foreground: color("warning-foreground") },
      info: { DEFAULT: color("info"), foreground: color("info-foreground") },
      kheleo: {
        canvas: "var(--kheleo-bg-canvas)",
        surface: "var(--kheleo-bg-surface)",
        elevated: "var(--kheleo-bg-elevated)",
        "gold-primary": "var(--kheleo-gold-primary)",
        "gold-shimmer": "var(--kheleo-gold-shimmer)",
        "crimson-primary": "var(--kheleo-crimson-primary)",
        "silver-chrome": "var(--kheleo-silver-chrome)",
        "silver-muted": "var(--kheleo-silver-muted)",
        "status-danger": "var(--kheleo-status-danger)",
        "status-warning": "var(--kheleo-status-warning)",
        "status-success": "var(--kheleo-status-success)",
        gold: color("kheleo-gold-rgb"),
        "gold-highlight": color("kheleo-gold-highlight"),
        crimson: color("kheleo-crimson-rgb"),
        silver: color("kheleo-silver-primary"),
        obsidian: color("kheleo-obsidian"),
        carbon: color("kheleo-carbon"),
      },
      chart: {
        gti: color("chart-gti"),
        participation: color("chart-participation"),
        equity: color("chart-equity"),
        critical: color("chart-critical"),
      },
    },
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        "metallic-gold": "var(--kheleo-metallic-gold)",
        "metallic-silver": "var(--kheleo-metallic-silver)",
      },
      boxShadow: {
        "crimson-glow": "0 0 20px -3px var(--kheleo-crimson-primary)",
        "gold-glow": "0 0 20px -3px var(--kheleo-gold-primary)",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
