import { z } from "zod";
export function parseResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new Error("The server returned an unexpected response. Please retry or contact support.");
  return result.data;
}
