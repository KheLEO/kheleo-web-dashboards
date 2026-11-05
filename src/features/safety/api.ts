"use client";
import { z } from "zod";
import {
  vitalsPageSchema,
  safetyHistoryPageSchema,
  healthAlertSchema,
  telemetryResultSchema,
} from "@/contracts/safety";
import { getApi, mutateApi } from "@/lib/api/browser-client";
import { envelope } from "@/lib/api/response-decoders";
import type { MutationOperation } from "@/lib/api/operation";
export const sendSimulatedTelemetry = (operation: MutationOperation) =>
  mutateApi("safety/telemetry-webhook", envelope(telemetryResultSchema), operation, "POST", {
    "x-kheleo-simulator": "true",
  });
export const sendHardwareTelemetry = (operation: MutationOperation) =>
  mutateApi("safety/telemetry-webhook", envelope(telemetryResultSchema), operation);
export const getTournamentVitals = (id: string, cursor: string | null, signal?: AbortSignal) =>
  getApi(
    `safety/tournaments/${id}/vitals`,
    envelope(vitalsPageSchema),
    { limit: 50, ...(cursor ? { cursor_id: cursor } : {}) },
    signal,
  );
export const getSafetyHistory = (id: string, cursor: string | null, signal?: AbortSignal) =>
  getApi(
    `safety/tournaments/${id}/alerts`,
    envelope(safetyHistoryPageSchema),
    { limit: 20, ...(cursor ? { cursor_id: cursor } : {}) },
    signal,
  );
export const acknowledgeSafety = (id: string, operation: MutationOperation) =>
  mutateApi(`safety/alerts/${id}/acknowledge`, envelope(healthAlertSchema), operation, "PATCH");
export const resumeSafetyMatch = (id: string, operation: MutationOperation) =>
  mutateApi(
    `safety/matches/${id}/resume`,
    envelope(z.object({ id: z.uuid(), status: z.string() })),
    operation,
  );
