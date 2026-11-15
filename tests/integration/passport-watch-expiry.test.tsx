import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { usePassport } from "@/features/passport/queries";
import { makePassport } from "@/test/factories";

const state = vi.hoisted(() => ({
  id: "00000000-0000-4000-8000-000000000001",
  getPassport: vi.fn(),
}));
vi.mock("@/features/auth/session-provider", () => ({
  useSession: () => ({ user: { id: state.id, role: "ATHLETE" } }),
}));
vi.mock("@/lib/socket", () => ({ useAthleteUpdates: () => {} }));
vi.mock("@/features/passport/api", () => ({
  getPassport: (...args: unknown[]) => state.getPassport(...args),
  getSports: vi.fn(),
}));
let client: QueryClient;
afterEach(() => {
  cleanup();
  client?.clear();
  vi.useRealTimers();
  vi.clearAllMocks();
});

it("refreshes an open passport when watch evidence expires without a socket event or window focus", async () => {
  vi.useFakeTimers();
  const initial = {
    ...makePassport(),
    userId: state.id,
    biomechanicalScore: 95,
    watchQualified: true,
    watchExpiresAt: Date.now() + 1000,
  };
  state.getPassport.mockResolvedValue({
    ...initial,
    watchQualified: false,
    biomechanicalScore: 35,
    biomechanicalCap: 35,
  });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(["passport", state.id, state.id, "ATHLETE"], initial);
  const { result } = renderHook(() => usePassport(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  expect(result.current.data?.biomechanicalScore).toBe(95);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1010);
  });
  expect(state.getPassport).toHaveBeenCalledTimes(1);
  expect(result.current.data?.biomechanicalScore).toBe(35);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });
  expect(state.getPassport).toHaveBeenCalledTimes(1);
});
