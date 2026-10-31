"use client";
import {
  colorFields,
  colorKeys,
  parseOverrides,
  variableEntries,
  type ColorField,
  type ThemeOverrides,
} from "@/lib/theme/customization";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
export type ThemePreset = "kheleo-gold-crimson" | "cyber-blue" | "royal-emerald" | "light-stadium";
export interface ThemeConfig {
  id: ThemePreset;
  name: string;
  badgeColor: string;
}
export const THEME_PRESETS: readonly ThemeConfig[] = [
  { id: "kheleo-gold-crimson", name: "Golden Crimson", badgeColor: "var(--theme-preview-gold)" },
  { id: "cyber-blue", name: "Midnight Cyber", badgeColor: "var(--theme-preview-cyber)" },
  { id: "royal-emerald", name: "Royal Emerald", badgeColor: "var(--theme-preview-emerald)" },
  { id: "light-stadium", name: "Light Stadium", badgeColor: "var(--theme-preview-light)" },
];
interface ThemeContextValue {
  theme: ThemePreset;
  overrides: ThemeOverrides;
  setColor: (key: ColorField, hex: string) => void;
  resetColors: () => void;
  setTheme: (theme: ThemePreset) => void;
  cycleTheme: () => void;
  themes: readonly ThemeConfig[];
}
const ThemeContext = createContext<ThemeContextValue | null>(null);
const storageKey = "kheleo-theme-preset";
const overridesKey = "kheleo-theme-overrides-v1";
let tabOverrides = "{}";
let memoryOverrides = false;
let memoryTheme = false;
function overrideSnapshot(): string {
  if (memoryOverrides) return tabOverrides;
  try {
    return localStorage.getItem(overridesKey) ?? tabOverrides;
  } catch {
    return tabOverrides;
  }
}
let tabTheme: ThemePreset = "kheleo-gold-crimson";
function isTheme(value: string | null): value is ThemePreset {
  return THEME_PRESETS.some((theme) => theme.id === value);
}
function snapshot(): ThemePreset {
  if (memoryTheme) return tabTheme;
  try {
    const value = localStorage.getItem(storageKey);
    return isTheme(value) ? value : tabTheme;
  } catch {
    return tabTheme;
  }
}
function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener("kheleo:theme", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("kheleo:theme", callback);
  };
}
export function ThemeProvider({
  children,
  defaultTheme = "kheleo-gold-crimson",
}: {
  children: ReactNode;
  defaultTheme?: ThemePreset;
}) {
  const theme = useSyncExternalStore(subscribe, snapshot, () => defaultTheme);
  const rawOverrides = useSyncExternalStore(subscribe, overrideSnapshot, () => "{}");
  const overrides = useMemo(() => parseOverrides(rawOverrides), [rawOverrides]);
  const [warning, setWarning] = useState<string | null>(null);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    for (const key of colorKeys) {
      const field = colorFields[key];
      root.style.removeProperty(field.channels);
      if ("hex" in field) root.style.removeProperty(field.hex);
    }
    for (const [name, value] of variableEntries(overrides)) root.style.setProperty(name, value);
    window.dispatchEvent(new Event("kheleo:theme-applied"));
  }, [theme, overrides]);
  const saveOverrides = (value: ThemeOverrides): void => {
    tabOverrides = JSON.stringify(value);
    try {
      localStorage.setItem(overridesKey, tabOverrides);
      memoryOverrides = false;
    } catch {
      memoryOverrides = true;
      setWarning("Theme applied for this tab. Browser storage is unavailable.");
    }
    window.dispatchEvent(new Event("kheleo:theme"));
  };
  const setTheme = (next: ThemePreset): void => {
    tabTheme = next;
    saveOverrides({});
    setWarning(null);
    try {
      localStorage.setItem(storageKey, next);
      memoryTheme = false;
    } catch {
      memoryTheme = true;
      setWarning("Theme applied for this tab. Browser storage is unavailable.");
    }
    document.documentElement.dataset.theme = next;
    window.dispatchEvent(new Event("kheleo:theme"));
  };
  const cycleTheme = (): void => {
    const index = THEME_PRESETS.findIndex((entry) => entry.id === theme);
    setTheme(THEME_PRESETS[(index + 1) % THEME_PRESETS.length]!.id);
  };
  return (
    <ThemeContext.Provider
      value={{
        theme,
        overrides,
        setColor: (key, hex) =>
          saveOverrides({ ...overrides, ...parseOverrides(JSON.stringify({ [key]: hex })) }),
        resetColors: () => saveOverrides({}),
        setTheme,
        cycleTheme,
        themes: THEME_PRESETS,
      }}
    >
      {children}
      {warning && (
        <p role="status" className="fixed bottom-5 right-5 z-50 rounded border bg-card p-3 text-sm">
          {warning}
        </p>
      )}
    </ThemeContext.Provider>
  );
}
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("ThemeProvider is required.");
  return context;
}
export function ThemeSwitcher({ className = "" }: { className?: string }) {
  const { theme, setTheme, themes } = useTheme();
  return (
    <div
      aria-label="Theme selection"
      className={`inline-flex gap-2 rounded-full border bg-card p-2 ${className}`}
    >
      {themes.map((entry) => (
        <button
          key={entry.id}
          type="button"
          aria-label={entry.name}
          aria-pressed={theme === entry.id}
          onClick={() => setTheme(entry.id)}
          className="rounded-full border border-border p-1 focus-visible:outline"
        >
          <span
            className="block h-3 w-3 rounded-full"
            style={{ backgroundColor: entry.badgeColor }}
          />
        </button>
      ))}
    </div>
  );
}
