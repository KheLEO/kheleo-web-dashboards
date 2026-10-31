"use client";

import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { createQueryClient } from "@/lib/query/client";
export const createGlobalQueryClient = createQueryClient;

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
