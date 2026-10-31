"use client";
import { freeAgentStatusSchema, leavePoolSchema } from "@/contracts/matchmaking";
import { getApi, mutateApi } from "@/lib/api/browser-client";
import { envelope } from "@/lib/api/response-decoders";
import type { MutationOperation } from "@/lib/api/operation";
const base = (tournamentId: string, bracketId: string): string =>
  `tournaments/${tournamentId}/brackets/${bracketId}/free-agents`;
export const getPool = (tournamentId: string, bracketId: string, signal?: AbortSignal) =>
  getApi(
    `${base(tournamentId, bracketId)}/status`,
    envelope(freeAgentStatusSchema),
    undefined,
    signal,
  );
export const joinPool = (tournamentId: string, bracketId: string, operation: MutationOperation) =>
  mutateApi(`${base(tournamentId, bracketId)}/join`, envelope(freeAgentStatusSchema), operation);
export const leavePool = (tournamentId: string, bracketId: string, operation: MutationOperation) =>
  mutateApi(
    `${base(tournamentId, bracketId)}/leave`,
    envelope(leavePoolSchema),
    operation,
    "DELETE",
  );
