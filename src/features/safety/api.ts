"use client";
import { telemetryResultSchema } from "@/contracts/safety";
import { mutateApi } from "@/lib/api/browser-client";
import { envelope } from "@/lib/api/response-decoders";
import type { MutationOperation } from "@/lib/api/operation";
export const sendSimulatedTelemetry = (operation: MutationOperation) =>
  mutateApi("safety/telemetry-webhook", envelope(telemetryResultSchema), operation, "POST", {
    "x-kheleo-simulator": "true",
  });
