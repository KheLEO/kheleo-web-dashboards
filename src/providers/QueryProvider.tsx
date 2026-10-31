"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, type DefaultOptions } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ApiProblemError } from "@/lib/api-client";
import { ApiError } from "@/lib/api/errors";

export interface CursorPageResult<T> {
  data: T[];
  next_cursor?: string | null;
  has_more: boolean;
}

export function createGlobalQueryClient(): QueryClient {
  const defaultOptions: DefaultOptions = {
    queries: {
      staleTime: 60 * 1000, // 1 minute fresh
      gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Never retry client auth or sandbagging conflicts
        if (error instanceof ApiProblemError) {
          if ([400, 401, 403, 404, 409, 422].includes(error.status)) {
            return false;
          }
        }
        if (error instanceof ApiError) {
          if ([400, 401, 403, 404, 409, 422].includes(error.problem.status)) {
            return false;
          }
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      retry: false,
    },
  };

  return new QueryClient({ defaultOptions });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createGlobalQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        theme="dark"
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: "rgb(var(--card))",
            borderColor: "rgb(var(--border))",
            color: "rgb(var(--foreground))",
          },
        }}
      />
    </QueryClientProvider>
  );
}
