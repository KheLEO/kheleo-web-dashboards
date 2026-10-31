"use client";
import { z } from "zod";
import axios from "axios";
import { getApi, mutateApi } from "./api/browser-client";
import { ApiError, asApiError } from "./api/errors";
import { createOperation } from "./api/operation";

// HTTP credentials stay in the server relay; bearer injection is in server/api/nest-client.ts.
export { getApi };
export const apiClient = axios.create({
  baseURL: "/api/backend",
  timeout: 20000,
  withCredentials: true,
});
apiClient.interceptors.request.use((config) => {
  if (
    ["POST", "PATCH", "DELETE"].includes(config.method?.toUpperCase() ?? "") &&
    !config.headers.has("Idempotency-Key")
  )
    config.headers.set("Idempotency-Key", crypto.randomUUID());
  return config;
});
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(asApiError(error)),
);
export class ApiProblemError extends ApiError {
  get status(): number {
    return this.problem.status;
  }
  get isSandbaggingDetected(): boolean {
    return this.problem.status === 409 && this.problem.code === "SANDBAGGING_DETECTED";
  }
}
export async function postApi<T>(
  url: string,
  schema: z.ZodType<T>,
  data: unknown,
  id?: string,
): Promise<T> {
  const operation = createOperation(data);
  return mutateApi(url.replace(/^\//, ""), schema, id ? { ...operation, id } : operation);
}
export async function patchApi<T>(url: string, schema: z.ZodType<T>, data: unknown): Promise<T> {
  return mutateApi(url.replace(/^\//, ""), schema, createOperation(data), "PATCH");
}
export async function deleteApi<T>(url: string, schema: z.ZodType<T>): Promise<T> {
  return mutateApi(url.replace(/^\//, ""), schema, createOperation({}), "DELETE");
}
