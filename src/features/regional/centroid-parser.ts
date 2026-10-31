import { geoPointSchema } from "@/contracts/regional";
export function parseCentroid(input: unknown): [number, number] | null {
  const result = geoPointSchema.safeParse(input);
  return result.success ? [result.data.coordinates[1], result.data.coordinates[0]] : null;
}
