"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemePreset = "kheleo-gold-crimson" | "cyber-blue" | "royal-emerald";

export interface ThemeConfig {
  id: ThemePreset;
  name: string;
  badgeColor: string;
  accentColor: string;
}

export const THEME_PRESETS: readonly ThemeConfig[] = [
  {
    id: "kheleo-gold-crimson",
    name: "Golden Crimson (Original KheLEO)",
    badgeColor: "#F5B014",
    accentColor: "#D91E2A",
  },
  {
    id: "cyber-blue",
    name: "Cyber Blue Neon",
    badgeColor: "#00F0FF",
    accentColor: "#FF0055",
  },
  {
    id: "royal-emerald",
    name: "Royal Emerald",
    badgeColor: "#10B981",
    accentColor: "#E11D48",
  },
] as const;

interface ThemeContextValue {
  theme: ThemePreset;
  setTheme: (theme: ThemePreset) => void;
  cycleTheme: () => void;
  themes: readonly ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "kheleo-theme-preset";

export function ThemeProvider({
  children,
  defaultTheme = "kheleo-gold-crimson",
}: {
  children: ReactNode;
  defaultTheme?: ThemePreset;
}) {
  const [theme, setThemeState] = useState<ThemePreset>(defaultTheme);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemePreset | null;
      if (saved && THEME_PRESETS.some((preset) => preset.id === saved)) {
        setThemeState(saved);
        document.documentElement.setAttribute("data-theme", saved);
      } else {
        document.documentElement.setAttribute("data-theme", defaultTheme);
      }
    } catch {
      document.documentElement.setAttribute("data-theme", defaultTheme);
    }
    setMounted(true);
  }, [defaultTheme]);

  const setTheme = (newTheme: ThemePreset) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
    } catch {
      document.documentElement.setAttribute("data-theme", newTheme);
    }
  };

  const cycleTheme = () => {
    const currentIndex = THEME_PRESETS.findIndex((preset) => preset.id === theme);
    const nextIndex = (currentIndex + 1) % THEME_PRESETS.length;
    const nextPreset = THEME_PRESETS[nextIndex];
    if (nextPreset) {
      setTheme(nextPreset.id);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme, themes: THEME_PRESETS }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

export function ThemeSwitcher({ className = "" }: { className?: string }) {
  const { theme, setTheme, themes } = useTheme();

  return (
    <div
      aria-label="Theme Switcher"
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 p-1 text-xs backdrop-blur-md ${className}`}
    >
      {themes.map((t) => {
        const isActive = t.id === theme;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTheme(t.id)}
            title={t.name}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <span
              className="h-2 w-2 rounded-full ring-1 ring-white/20"
              style={{ backgroundColor: t.badgeColor }}
            />
            <span className="hidden sm:inline">
              {t.id === "kheleo-gold-crimson"
                ? "Gold"
                : t.id === "cyber-blue"
                  ? "Cyber"
                  : "Emerald"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
