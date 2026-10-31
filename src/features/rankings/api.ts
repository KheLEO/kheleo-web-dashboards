"use client";
import { rankSchema, gtiSchema } from "@/contracts/gti";
import { getApi, mutateApi } from "@/lib/api/browser-client";
import { envelope } from "@/lib/api/response-decoders";
import type { MutationOperation } from "@/lib/api/operation";
export const getRank = (sport: string, id: string, district?: string, signal?: AbortSignal) =>
  getApi(
    `gti/rank/${sport}/${id}`,
    envelope(rankSchema),
    district ? { district } : undefined,
    signal,
  );
export const recalculateGti = (id: string, operation: MutationOperation) =>
  mutateApi(`gti/recalculate/${id}`, envelope(gtiSchema), operation);
