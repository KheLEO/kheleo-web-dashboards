import axios from "axios";
import { problemSchema, type ApiProblem } from "@/contracts/common";
export class ApiError extends Error {
  constructor(public readonly problem: ApiProblem) {
    super(problem.detail);
    this.name = "ApiError";
  }
  get status(): number {
    return this.problem.status;
  }
  get isSandbaggingDetected(): boolean {
    return this.status === 409 && this.problem.code === "SANDBAGGING_DETECTED";
  }
}
export function asApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError<unknown>(error)) {
    const parsed = problemSchema.safeParse(error.response?.data);
    if (parsed.success) return new ApiError(parsed.data);
    return new ApiError({
      type: "about:blank",
      title: "Connection error",
      status: error.response?.status ?? 503,
      detail:
        "The service could not complete this request. Your submission has not been confirmed.",
      instance: "",
      timestamp: new Date().toISOString(),
    });
  }
  return new ApiError({
    type: "about:blank",
    title: "Request failed",
    status: 500,
    detail: error instanceof Error ? error.message : "The request could not be completed.",
    instance: "",
    timestamp: new Date().toISOString(),
  });
}
