"use client";
import { cursorPageSchema } from "@/contracts/common";
import { passportSchema, sportRecordSchema } from "@/contracts/passport";
import { getApi, mutateApi } from "@/lib/api/browser-client";
import { envelope } from "@/lib/api/response-decoders";
import type { MutationOperation } from "@/lib/api/operation";
export const getPassport = (id: string, signal?: AbortSignal) =>
  getApi(`passport/${id}`, envelope(passportSchema), undefined, signal);
export const getSports = (id: string, cursor: string | null, signal?: AbortSignal) =>
  getApi(
    `passport/${id}/sports`,
    envelope(cursorPageSchema(sportRecordSchema)),
    { limit: 20, ...(cursor ? { cursor_id: cursor } : {}) },
    signal,
  );
export const savePassport = (id: string, operation: MutationOperation, create: boolean) =>
  mutateApi(`passport/${id}`, envelope(passportSchema), operation, create ? "POST" : "PATCH");
export const saveSport = (id: string, operation: MutationOperation) =>
  mutateApi(`passport/${id}/sports`, envelope(sportRecordSchema), operation);
