import { z } from "zod";
export function withGtiAliases<T>(schema: z.ZodType<T>): z.ZodType<T> {
  return z.preprocess((input: unknown) => {
    if (!input || typeof input !== "object" || Array.isArray(input)) return input;
    const value = { ...input } as Record<string, unknown>;
    for (const [alias, canonical] of [
      ["min_gti", "minGti"],
      ["max_gti", "maxGti"],
    ] as const) {
      if (!(alias in value)) continue;
      if (canonical in value && value[canonical] !== value[alias]) return input;
      value[canonical] = value[alias];
      delete value[alias];
    }
    return value;
  }, schema);
}
