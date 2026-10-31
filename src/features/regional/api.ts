"use client";
import { regionalSchema } from "@/contracts/regional";
import { getApi } from "@/lib/api/browser-client";
export const getRegional = (signal?: AbortSignal) =>
  getApi("heatmaps/regional", regionalSchema, undefined, signal);
