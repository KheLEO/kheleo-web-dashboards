import "server-only";
import http from "node:http";
import https from "node:https";
import axios, { type AxiosInstance } from "axios";
import { getEnvironment } from "@/server/env";
import { asApiError } from "@/lib/api/errors";
import { headers as incomingHeaders } from "next/headers";
import { clientIpHeaders, forwardedClientIp } from "@/server/security/client-ip";

export interface NestRequest {
  method: string;
  path: string;
  token?: string;
  body?: string;
  operationId?: string;
  signature?: { name: string; value: string };
  query?: Record<string, unknown>;
}

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 64, keepAliveMsecs: 30000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 64, keepAliveMsecs: 30000 });
const clientCache = new Map<string, AxiosInstance>();

function getPooledClient(baseURL: string): AxiosInstance {
  let instance = clientCache.get(baseURL);
  if (!instance) {
    instance = axios.create({
      baseURL,
      timeout: 12000,
      maxRedirects: 0,
      maxContentLength: 5 * 1024 * 1024,
      maxBodyLength: 256 * 1024,
      httpAgent,
      httpsAgent,
    });
    clientCache.set(baseURL, instance);
  }
  return instance;
}

export async function callNest(request: NestRequest): Promise<unknown> {
  const baseURL = getEnvironment().NEST_API_URL.replace(/\/$/, "") + "/";
  const client = getPooledClient(baseURL);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (request.token) headers["Authorization"] = `Bearer ${request.token}`;
  if (request.operationId) headers["Idempotency-Key"] = request.operationId;
  if (request.signature) headers[request.signature.name] = request.signature.value;
  // Railway supplies one trusted ingress hop. Other deployments must configure their proxy suffix explicitly.
  const trustedHops = Number(
    process.env.TRUSTED_PROXY_HOPS ?? (process.env.RAILWAY_ENVIRONMENT_ID ? "1" : "0"),
  );
  if (trustedHops > 0) {
    const ip = forwardedClientIp(await incomingHeaders(), trustedHops);
    if (ip)
      Object.assign(
        headers,
        clientIpHeaders(
          ip,
          process.env.BFF_PROXY_SECRET || getEnvironment().TELEMETRY_SERVICE_HMAC_SECRET,
        ),
      );
  }

  try {
    const response = await client.request<unknown>({
      method: request.method,
      url: request.path,
      headers,
      ...(request.body !== undefined ? { data: request.body } : {}),
      ...(request.query ? { params: request.query } : {}),
    });
    return response.data;
  } catch (error: unknown) {
    throw asApiError(error);
  }
}
