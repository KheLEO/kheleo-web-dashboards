import { z } from "zod";
export function envelope<T>(schema: z.ZodType<T>): z.ZodType<T> {
  return z
    .object({ success: z.literal(true), data: z.unknown(), timestamp: z.string() })
    .transform((value) => schema.parse(value.data));
}
