"use client";
import { z } from "zod";
import {
  scoutAlertProjectionSchema,
  scoutAlertSchema,
  scoutFeedSchema,
  type ScoutFeedQuery,
} from "@/contracts/scouting";
import { getApi, mutateApi } from "@/lib/api/browser-client";
import { envelope } from "@/lib/api/response-decoders";
import type { MutationOperation } from "@/lib/api/operation";
export const getProspects = (filters: ScoutFeedQuery, signal?: AbortSignal) =>
  getApi("scouts/feed", scoutFeedSchema, filters, signal);
export const getAlerts = (filters: { sport?: string; district?: string }, signal?: AbortSignal) =>
  getApi("scouts/alerts", envelope(z.array(scoutAlertProjectionSchema)), filters, signal);
export const acknowledgeAlert = (id: string, operation: MutationOperation) =>
  mutateApi(`scouts/alerts/${id}/acknowledge`, envelope(scoutAlertSchema), operation, "PATCH");
