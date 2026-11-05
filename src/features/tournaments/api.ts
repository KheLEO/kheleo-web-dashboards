"use client";
import { z } from "zod";
import { cursorPageSchema } from "@/contracts/common";
import {
  bracketSchema,
  registrationSchema,
  tournamentDetailSchema,
  tournamentLocationSchema,
  tournamentSchema,
  type NearbyTournamentsQuery,
} from "@/contracts/tournaments";
import { getApi, mutateApi } from "@/lib/api/browser-client";
import { envelope } from "@/lib/api/response-decoders";
import type { MutationOperation } from "@/lib/api/operation";
const nearbyPageSchema = z.union([
  z.object({
    data: z.array(tournamentLocationSchema),
    next_cursor: z.string().nullable(),
    has_more: z.boolean(),
  }),
  z.array(tournamentLocationSchema),
]);

export interface NearbyPageResult {
  data: z.infer<typeof tournamentLocationSchema>[];
  next_cursor: string | null;
  has_more: boolean;
}

export const getNearby = async (
  query: NearbyTournamentsQuery,
  signal?: AbortSignal,
): Promise<NearbyPageResult> => {
  const result = await getApi("tournaments/nearby", envelope(nearbyPageSchema), query, signal);
  if (Array.isArray(result)) {
    return {
      data: result,
      next_cursor: null,
      has_more: false,
    };
  }
  return result;
};
export const getTournament = (id: string, signal?: AbortSignal) =>
  getApi(`tournaments/${id}`, envelope(tournamentDetailSchema), undefined, signal);
export const getBrackets = (id: string, cursor: string | null, signal?: AbortSignal) =>
  getApi(
    `tournaments/${id}/brackets`,
    envelope(cursorPageSchema(bracketSchema)),
    { limit: 20, ...(cursor ? { cursor_id: cursor } : {}) },
    signal,
  );
export const createTournament = (operation: MutationOperation) =>
  mutateApi("tournaments", envelope(tournamentSchema), operation);
export const createBracket = (id: string, operation: MutationOperation) =>
  mutateApi(`tournaments/${id}/brackets`, envelope(bracketSchema), operation);
export const registerBracket = (id: string, bracketId: string, operation: MutationOperation) =>
  mutateApi(
    `tournaments/${id}/brackets/${bracketId}/register`,
    envelope(registrationSchema),
    operation,
  );
export const updateTournament = (id: string, operation: MutationOperation) =>
  mutateApi(`tournaments/${id}`, envelope(tournamentSchema), operation, "PATCH");
export const deleteTournament = (id: string, operation: MutationOperation) =>
  mutateApi(`tournaments/${id}`, envelope(tournamentSchema), operation, "DELETE");
export const updateBracket = (id: string, bracketId: string, operation: MutationOperation) =>
  mutateApi(`tournaments/${id}/brackets/${bracketId}`, envelope(bracketSchema), operation, "PATCH");
export const deleteBracket = (id: string, bracketId: string, operation: MutationOperation) =>
  mutateApi(
    `tournaments/${id}/brackets/${bracketId}`,
    envelope(bracketSchema),
    operation,
    "DELETE",
  );
