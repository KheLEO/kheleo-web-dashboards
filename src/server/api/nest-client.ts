import "server-only";
import axios from "axios";
import { getEnvironment } from "@/server/env";
import { asApiError } from "@/lib/api/errors";
export interface NestRequest {
  method: string;
  path: string;
  token?: string;
  body?: string;
  operationId?: string;
  signature?: { name: string; value: string };
  query?: Record<string, unknown>;
}
export async function callNest(request: NestRequest): Promise<unknown> {
  const client = axios.create({
    baseURL: getEnvironment().NEST_API_URL.replace(/\/$/, "") + "/",
    timeout: 12000,
    maxRedirects: 0,
    maxContentLength: 5 * 1024 * 1024,
    maxBodyLength: 256 * 1024,
  });
  client.interceptors.request.use((config) => {
    if (request.token) config.headers.set("Authorization", `Bearer ${request.token}`);
    if (request.operationId) config.headers.set("Idempotency-Key", request.operationId);
    if (request.signature) config.headers.set(request.signature.name, request.signature.value);
    config.headers.set("Content-Type", "application/json");
    return config;
  });
  try {
    const response = await client.request<unknown>({
      method: request.method,
      url: request.path,
      ...(request.body !== undefined ? { data: request.body } : {}),
      ...(request.query ? { params: request.query } : {}),
    });
    return response.data;
  } catch (error: unknown) {
    throw asApiError(error);
  }
}
