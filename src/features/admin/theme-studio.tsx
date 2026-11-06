"use client";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useTheme } from "@/providers/ThemeProvider";
import {
  colorFields,
  colorKeys,
  channelsHex,
  contrastRatio,
  exportVariables,
  themeCss,
} from "@/lib/theme/customization";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
function subscribe(callback: () => void): () => void {
  window.addEventListener("kheleo:theme-applied", callback);
  return () => window.removeEventListener("kheleo:theme-applied", callback);
}
function snapshot(): string {
  const style = getComputedStyle(document.documentElement);
  return JSON.stringify(
    Object.fromEntries(
      colorKeys.map((key) => [key, channelsHex(style.getPropertyValue(colorFields[key].channels))]),
    ),
  );
}
export function ThemeStudio() {
  const { theme, themes, setTheme, setColor, resetColors } = useTheme();
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  const colors = useMemo(
    () => (raw ? (JSON.parse(raw) as Record<keyof typeof colorFields, string | null>) : null),
    [raw],
  );
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  async function copy(): Promise<void> {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard access is unavailable in this browser.");
      const style = getComputedStyle(document.documentElement);
      await navigator.clipboard.writeText(
        themeCss(
          exportVariables.map((name) => [name, style.getPropertyValue(name).trim()] as const),
          style.colorScheme,
        ),
      );
      setFailed(false);
      setMessage("CSS palette copied. Merge it into globals.css to apply it to a deployment.");
    } catch (error: unknown) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "CSS could not be copied.");
    }
  }
  const checks = colors
    ? [
        { label: "Body text on canvas", fg: colors.foreground, bg: colors.background },
        { label: "Muted text on cards", fg: colors.muted, bg: colors.surface },
        { label: "Accent text on cards", fg: colors.primary, bg: colors.surface },
        { label: "Primary action text", fg: colors.background, bg: colors.primary },
      ]
    : [];
  return (
    <div className="space-y-6">
      <Alert>
        Preview preferences apply in this browser and its tabs. They do not publish a platform-wide
        theme. Copy the CSS palette for a reviewed deployment; authentication and biometric data are
        not stored with theme preferences.
      </Alert>
      <Card>
        <h2 className="mb-5 text-lg font-semibold">Theme presets</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {themes.map((entry) => (
            <Button
              key={entry.id}
              variant="secondary"
              aria-pressed={theme === entry.id}
              onClick={() => setTheme(entry.id)}
              className={theme === entry.id ? "border-primary" : ""}
            >
              {entry.name}
            </Button>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="mb-5 text-lg font-semibold">Live CSS colors</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {colorKeys.map((key) => {
            const value = colors?.[key];
            return (
              value && (
                <label className="field" key={key}>
                  {colorFields[key].label}
                  <input
                    aria-label={`${colorFields[key].label} color`}
                    type="color"
                    value={value}
                    onChange={(event) => setColor(key, event.target.value)}
                    className="h-12 w-full rounded border bg-card p-1"
                  />
                  <span className="break-all font-mono text-xs text-muted-foreground">
                    {colorFields[key].channels} · {value}
                  </span>
                </label>
              )
            );
          })}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            onClick={() => {
              void copy();
            }}
          >
            Copy globals.css Config
          </Button>
          <Button variant="secondary" onClick={resetColors}>
            Reset custom colors
          </Button>
        </div>
        {message && (
          <div className="mt-4">
            <Alert danger={failed}>{message}</Alert>
          </div>
        )}
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Component preview</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primary action</Button>
          <Button variant="secondary">Secondary action</Button>
          <Button variant="destructive">Destructive action</Button>
          <Badge>Verified identity</Badge>
        </div>
        <p className="mt-5 text-muted-foreground">
          Muted labels and data surfaces use the same semantic palette as the dashboards.
        </p>
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Contrast spot checks</h2>
        <ul className="space-y-3 text-sm">
          {checks.map((check) => {
            const ratio = check.fg && check.bg ? contrastRatio(check.fg, check.bg) : null;
            return (
              <li key={check.label}>
                {check.label}:{" "}
                {ratio === null
                  ? "Not measurable"
                  : `${ratio.toFixed(2)}:1 · ${ratio >= 4.5 ? "AA normal text threshold met" : "Below AA normal text threshold"}`}
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          These spot checks do not establish whole-application accessibility. Validate states,
          charts, focus and text contrast before releasing an experimental palette.
        </p>
      </Card>
    </div>
  );
}
