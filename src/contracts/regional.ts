import { z } from "zod";
import { jsonObjectSchema } from "./common";
export const districtSchema = z.object({
  state: z.string(),
  district: z.string(),
  total_athletes: z.number().int().min(0),
  average_gti: z.number().min(0).max(100),
  female_participation_pct: z.number().min(0).max(100),
  centroid: jsonObjectSchema.nullable(),
});
export const regionalSchema = z.object({
  success: z.boolean(),
  count: z.number().int().min(0),
  is_complete: z.boolean(),
  data: z.array(districtSchema),
});
export const geoPointSchema = z.object({
  type: z.literal("Point"),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
});
export type DistrictHeatmapRecord = z.infer<typeof districtSchema>;
export type RegionalHeatmapResponse = z.infer<typeof regionalSchema>;
export type GeoJsonPoint = z.infer<typeof geoPointSchema>;
