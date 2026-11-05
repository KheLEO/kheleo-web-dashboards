"use client";
import { z } from "zod";
import { cursorPageSchema } from "@/contracts/common";
import { tournamentSchema } from "@/contracts/tournaments";
import {
  organizerSummarySchema,
  registrationsPageSchema,
  poolPageSchema,
  sandbaggingPageSchema,
  matchResultSchema,
} from "@/contracts/organizer";
import { getApi, mutateApi } from "@/lib/api-client";
import { envelope } from "@/lib/api/response-decoders";
import type { MutationOperation } from "@/lib/api/operation";
const params = (cursor: string | null) => ({ limit: 20, ...(cursor ? { cursor_id: cursor } : {}) });
const bracketPath = (tournamentId: string, bracketId: string) =>
  `tournaments/${tournamentId}/brackets/${bracketId}`;
export const getOrganizerSummary = (signal?: AbortSignal) =>
  getApi("tournaments/organizer/summary", envelope(organizerSummarySchema), undefined, signal);
export const getOwnedTournaments = (cursor: string | null, signal?: AbortSignal) =>
  getApi(
    "tournaments/organizer/mine",
    envelope(cursorPageSchema(tournamentSchema)),
    params(cursor),
    signal,
  );
export const getRegistrations = (
  tournamentId: string,
  bracketId: string,
  cursor: string | null,
  signal?: AbortSignal,
) =>
  getApi(
    `${bracketPath(tournamentId, bracketId)}/registrations`,
    envelope(registrationsPageSchema),
    params(cursor),
    signal,
  );
export const getPool = (
  tournamentId: string,
  bracketId: string,
  cursor: string | null,
  signal?: AbortSignal,
) =>
  getApi(
    `${bracketPath(tournamentId, bracketId)}/free-agents/pool`,
    envelope(poolPageSchema),
    params(cursor),
    signal,
  );
export const getSandbaggingLogs = (id: string, cursor: string | null, signal?: AbortSignal) =>
  getApi(
    `tournaments/${id}/sandbagging-logs`,
    envelope(sandbaggingPageSchema),
    params(cursor),
    signal,
  );
export const processPool = (
  tournamentId: string,
  bracketId: string,
  operation: MutationOperation,
) =>
  mutateApi(
    `${bracketPath(tournamentId, bracketId)}/free-agents/process`,
    envelope(z.object({ formed: z.boolean() })),
    operation,
  );
export const recordMatchResult = (
  tournamentId: string,
  bracketId: string,
  operation: MutationOperation,
) =>
  mutateApi(
    `${bracketPath(tournamentId, bracketId)}/matches/results`,
    envelope(matchResultSchema),
    operation,
  );
