"use client";
import axios from "axios";
import { z } from "zod";
import { parseResponse } from "@/contracts/validators";
import { asApiError } from "./errors";
import type { MutationOperation } from "./operation";
export const browserClient = axios.create({
  baseURL: "/api",
  timeout: 20000,
  withCredentials: true,
});
browserClient.interceptors.request.use((config) => {
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(config.method?.toUpperCase() ?? "") &&
    !config.headers.has("Idempotency-Key")
  ) {
    config.headers.set("Idempotency-Key", crypto.randomUUID());
  }
  return config;
});
browserClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(asApiError(error)),
);
export async function getApi<T>(
  path: string,
  schema: z.ZodType<T>,
  params?: object,
  signal?: AbortSignal,
): Promise<T> {
  const response = await browserClient.get<unknown>(`/backend/${path}`, {
    params,
    ...(signal ? { signal } : {}),
  });
  return parseResponse(schema, response.data);
}
export async function mutateApi<T>(
  path: string,
  schema: z.ZodType<T>,
  operation: MutationOperation,
  method: "POST" | "PUT" | "PATCH" | "DELETE" = "POST",
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const response = await browserClient.request<unknown>({
    url: `/backend/${path}`,
    method,
    data: operation.body,
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": operation.id,
      ...extraHeaders,
    },
  });
  return parseResponse(schema, response.data);
}
