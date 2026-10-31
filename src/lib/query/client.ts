import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/errors";
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30000,
        gcTime: 120000,
        retry: (count, error) =>
          count < 2 && (!(error instanceof ApiError) || error.problem.status >= 500),
        refetchOnWindowFocus: false,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
      },
      mutations: { retry: false },
    },
  });
}
