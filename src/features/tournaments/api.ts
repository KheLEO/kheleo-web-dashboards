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
export const getNearby = (query: NearbyTournamentsQuery, signal?: AbortSignal) =>
  getApi("tournaments/nearby", envelope(z.array(tournamentLocationSchema)), query, signal);
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
