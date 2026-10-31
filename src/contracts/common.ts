import { z } from "zod";
export type UUID = string;
export type ISODateString = string;
export type DecimalString = string;
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export const jsonSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonSchema),
    z.record(z.string(), jsonSchema),
  ]),
);
export const jsonObjectSchema = z.record(z.string(), jsonSchema);
export const uuidSchema = z.uuid();
export const dateSchema = z.iso.datetime({ offset: true });
export const decimalSchema = z.string().regex(/^-?\d+(\.\d+)?$/);
export const problemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string(),
  instance: z.string(),
  timestamp: z.string(),
  invalidParams: z.array(z.object({ name: z.string(), reason: z.string() })).optional(),
  code: z.string().optional(),
  athleteGti: z.number().optional(),
  bracketMaxGti: z.number().optional(),
  bracketMinGti: z.number().optional(),
  suggestedBracketId: uuidSchema.nullable().optional(),
  suggestedBracketTier: z.string().nullable().optional(),
});
export type ApiProblem = z.infer<typeof problemSchema>;
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  timestamp: ISODateString;
}
export interface CursorQuery {
  limit?: number;
  cursor_id?: UUID;
}
export interface CursorPage<T> {
  data: T[];
  next_cursor: UUID | null;
  has_more: boolean;
  count: number;
}
export function cursorPageSchema<T extends z.ZodType>(item: T) {
  return z.object({
    data: z.array(item),
    next_cursor: uuidSchema.nullable(),
    has_more: z.boolean(),
    count: z.number().int().nonnegative(),
  });
}
export const cursorQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    cursor_id: uuidSchema.optional(),
  })
  .strict();
