import { z } from "zod";
export const colorFields = {
  primary: { label: "Primary accent", hex: "--kheleo-gold-primary", channels: "--kheleo-gold-rgb" },
  crimson: {
    label: "Critical / destructive",
    hex: "--kheleo-crimson-primary",
    channels: "--kheleo-crimson-rgb",
  },
  background: { label: "Canvas", hex: "--kheleo-bg-canvas", channels: "--kheleo-obsidian" },
  surface: { label: "Card surface", hex: "--kheleo-bg-surface", channels: "--kheleo-carbon" },
  foreground: {
    label: "Primary text",
    hex: "--kheleo-silver-chrome",
    channels: "--kheleo-silver-primary",
  },
  muted: { label: "Muted text", hex: "--kheleo-silver-muted", channels: "--kheleo-text-muted" },
  highlight: {
    label: "Highlight / focus",
    hex: "--kheleo-gold-shimmer",
    channels: "--kheleo-gold-highlight",
  },
  border: { label: "Borders", channels: "--kheleo-border" },
} as const;
export type ColorField = keyof typeof colorFields;
export const colorKeys = Object.keys(colorFields) as ColorField[];
const hexSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const overridesSchema = z.partialRecord(
  z.enum(colorKeys as [ColorField, ...ColorField[]]),
  hexSchema,
);
export type ThemeOverrides = Partial<Record<ColorField, string>>;
export function parseOverrides(input: string): ThemeOverrides {
  try {
    const parsed = overridesSchema.safeParse(JSON.parse(input) as unknown);
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}
export function hexChannels(hex: string): [number, number, number] {
  const valid = hexSchema.parse(hex);
  return [
    Number.parseInt(valid.slice(1, 3), 16),
    Number.parseInt(valid.slice(3, 5), 16),
    Number.parseInt(valid.slice(5, 7), 16),
  ];
}
export function channelsHex(value: string): string | null {
  const numbers = value.trim().split(/\s+/).map(Number);
  if (
    numbers.length !== 3 ||
    numbers.some((number) => !Number.isInteger(number) || number < 0 || number > 255)
  )
    return null;
  return `#${numbers.map((number) => number.toString(16).padStart(2, "0")).join("")}`;
}
export function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string): number => {
    const rgb = hexChannels(hex).map((number) => {
      const channel = number / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
  };
  const first = luminance(a),
    second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
export function variableEntries(overrides: ThemeOverrides): Array<[string, string]> {
  return colorKeys.flatMap((key) => {
    const value = overrides[key];
    if (!value) return [];
    const field = colorFields[key];
    return [
      ...("hex" in field ? [[field.hex, value] as [string, string]] : []),
      [field.channels, hexChannels(value).join(" ")] as [string, string],
    ];
  });
}
export const exportVariables = [
  ...new Set([
    ...colorKeys.flatMap((key) => {
      const field = colorFields[key];
      return [field.channels, ...("hex" in field ? [field.hex] : [])];
    }),
    "--kheleo-bg-elevated",
    "--kheleo-surface-raised",
    "--kheleo-success",
    "--kheleo-info",
    "--kheleo-text-on-crimson",
    "--kheleo-status-danger",
    "--kheleo-status-warning",
    "--kheleo-status-success",
  ]),
];
export function themeCss(values: ReadonlyArray<readonly [string, string]>, scheme: string): string {
  return `/* Browser preview palette: merge with the semantic tokens in globals.css. */\n:root {\n  color-scheme: ${scheme === "light" ? "light" : "dark"};\n${values
    .filter(([name]) => exportVariables.includes(name))
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n")}\n}`;
}
