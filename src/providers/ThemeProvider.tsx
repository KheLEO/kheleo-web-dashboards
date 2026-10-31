"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
export type ThemePreset = "kheleo-gold-crimson" | "cyber-blue" | "royal-emerald";
export interface ThemeConfig {
  id: ThemePreset;
  name: string;
  badgeColor: string;
}
export const THEME_PRESETS: readonly ThemeConfig[] = [
  { id: "kheleo-gold-crimson", name: "Golden Crimson", badgeColor: "var(--theme-preview-gold)" },
  { id: "cyber-blue", name: "Cyber Blue", badgeColor: "var(--theme-preview-cyber)" },
  { id: "royal-emerald", name: "Royal Emerald", badgeColor: "var(--theme-preview-emerald)" },
];
interface ThemeContextValue {
  theme: ThemePreset;
  setTheme: (theme: ThemePreset) => void;
  cycleTheme: () => void;
  themes: readonly ThemeConfig[];
}
const ThemeContext = createContext<ThemeContextValue | null>(null);
const storageKey = "kheleo-theme-preset";
let tabTheme: ThemePreset = "kheleo-gold-crimson";
function isTheme(value: string | null): value is ThemePreset {
  return THEME_PRESETS.some((theme) => theme.id === value);
}
function snapshot(): ThemePreset {
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
  const [warning, setWarning] = useState<string | null>(null);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const setTheme = (next: ThemePreset): void => {
    tabTheme = next;
    setWarning(null);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
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
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme, themes: THEME_PRESETS }}>
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
