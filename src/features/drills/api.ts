"use client";
import { drillResultSchema } from "@/contracts/drills";
import { mutateApi } from "@/lib/api/browser-client";
import type { MutationOperation } from "@/lib/api/operation";
export const submitDrill = (operation: MutationOperation) =>
  mutateApi("drills/submit", drillResultSchema, operation);
