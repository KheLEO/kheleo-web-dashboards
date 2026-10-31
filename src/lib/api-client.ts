import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { z } from "zod";
import { problemSchema, type ApiProblem } from "@/contracts/common";

const DEFAULT_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

// Cache for action-based idempotency keys
const idempotencyKeyStore = new Map<string, { key: string; expiresAt: number }>();

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Derives a deterministic idempotency cache key from method, URL, and payload
 */
function getActionFingerprint(config: InternalAxiosRequestConfig): string {
  const method = config.method?.toUpperCase() || "POST";
  const url = config.url || "";
  let payloadHash = "";
  if (config.data) {
    try {
      payloadHash =
        typeof config.data === "string" ? config.data : JSON.stringify(config.data);
    } catch {
      payloadHash = "";
    }
  }
  return `${method}:${url}:${payloadHash}`;
}

export class ApiProblemError extends Error {
  public readonly problem: ApiProblem;
  public readonly status: number;
  public readonly isSandbaggingDetected: boolean;

  constructor(problem: ApiProblem) {
    super(problem.detail || problem.title || "An API error occurred");
    this.name = "ApiProblemError";
    this.problem = problem;
    this.status = problem.status;
    this.isSandbaggingDetected =
      problem.status === 409 || problem.code === "SANDBAGGING_DETECTED";
  }
}

export const apiClient = axios.create({
  baseURL: DEFAULT_BASE_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/problem+json, application/json",
  },
});

// Request Interceptors: Auth Token & Idempotency Key
apiClient.interceptors.request.use(
  async (config) => {
    // 1. Auth Interceptor: Attaches Supabase / Auth token
    if (typeof window !== "undefined") {
      try {
        const storedAuth = localStorage.getItem("kheleo-auth-store");
        if (storedAuth) {
          const parsed = JSON.parse(storedAuth);
          const token = parsed?.state?.token;
          if (token && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
      } catch {
        // Continue if storage read fails
      }
    }

    // 2. Idempotency Interceptor for mutating actions
    const method = config.method?.toUpperCase();
    if (method && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      if (!config.headers["Idempotency-Key"]) {
        const fingerprint = getActionFingerprint(config);
        const existing = idempotencyKeyStore.get(fingerprint);
        const now = Date.now();

        if (existing && existing.expiresAt > now) {
          config.headers["Idempotency-Key"] = existing.key;
        } else {
          const freshKey = generateUUID();
          // Cache for 60 seconds to guard against mobile flakiness / rapid double-taps
          idempotencyKeyStore.set(fingerprint, { key: freshKey, expiresAt: now + 60000 });
          config.headers["Idempotency-Key"] = freshKey;
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptors: RFC 7807 Error Parser
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<unknown>) => {
    if (error.response?.data) {
      const parsed = problemSchema.safeParse(error.response.data);
      if (parsed.success) {
        return Promise.reject(new ApiProblemError(parsed.data));
      }
    }

    const fallbackProblem: ApiProblem = {
      type: "about:blank",
      title: error.name === "AxiosError" ? "Network or Service Error" : "Unexpected Error",
      status: error.response?.status ?? 503,
      detail:
        (error.response?.data as { message?: string })?.message ||
        error.message ||
        "The operation could not be confirmed. Check your network connection.",
      instance: error.config?.url || "",
      timestamp: new Date().toISOString(),
    };

    return Promise.reject(new ApiProblemError(fallbackProblem));
  },
);

export async function getApi<T>(
  url: string,
  schema: z.ZodType<T>,
  params?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const response = await apiClient.get<unknown>(url, {
    ...(params ? { params } : {}),
    ...(signal ? { signal } : {}),
  });
  return schema.parse(response.data);
}

export async function postApi<T>(
  url: string,
  schema: z.ZodType<T>,
  data?: unknown,
  customIdempotencyKey?: string,
): Promise<T> {
  const headers = customIdempotencyKey ? { "Idempotency-Key": customIdempotencyKey } : {};
  const response = await apiClient.post<unknown>(url, data, { headers });
  return schema.parse(response.data);
}

export async function putApi<T>(
  url: string,
  schema: z.ZodType<T>,
  data?: unknown,
): Promise<T> {
  const response = await apiClient.put<unknown>(url, data);
  return schema.parse(response.data);
}

export async function patchApi<T>(
  url: string,
  schema: z.ZodType<T>,
  data?: unknown,
): Promise<T> {
  const response = await apiClient.patch<unknown>(url, data);
  return schema.parse(response.data);
}

export async function deleteApi<T>(
  url: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const response = await apiClient.delete<unknown>(url);
  return schema.parse(response.data);
}
