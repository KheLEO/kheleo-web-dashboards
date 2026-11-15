import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import type { AthletePassport } from "@/contracts/passport";
import { SportsPassportCard } from "@/components/athlete/SportsPassportCard";

const state = vi.hoisted(() => ({
  id: "00000000-0000-4000-8000-000000000001",
  recalculate: vi.fn(),
}));

vi.mock("@/features/auth/session-provider", () => ({
  useSession: () => ({
    user: { id: state.id, email: "athlete@example.test", role: "ATHLETE", isVerified: true },
  }),
}));
vi.mock("@/features/auth/identity-form", () => ({ IdentityForm: () => null }));
vi.mock("@/features/passport/queries", async () => {
  const { useQuery } = await import("@tanstack/react-query");
  return {
    usePassport: () =>
      useQuery({
        queryKey: ["passport", state.id, state.id, "ATHLETE"],
        // Keep the refetch pending to observe the immediate authoritative mutation result.
        queryFn: () => new Promise<AthletePassport>(() => {}),
        staleTime: Infinity,
      }),
    useSports: () => ({
      data: undefined,
      isPending: false,
      error: null,
      hasNextPage: false,
      isFetchingNextPage: false,
    }),
  };
});
vi.mock("@/features/rankings/api", () => ({
  recalculateGti: (...args: unknown[]) => state.recalculate(...args),
}));

let client: QueryClient;
afterEach(() => {
  cleanup();
  client?.clear();
  vi.clearAllMocks();
});

function showPassport(initialGti = 85, overrides: Partial<AthletePassport> = {}) {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  client.setQueryData<AthletePassport>(["passport", state.id, state.id, "ATHLETE"], {
    userId: state.id,
    athleteProfileId: "00000000-0000-4000-8000-000000000002",
    dateOfBirth: "2006-05-01",
    gender: "MALE",
    primarySport: "CRICKET",
    secondarySports: [],
    district: "Pune",
    state: "Maharashtra",
    tierClassification: "RURAL",
    physicalStats: { heightCm: null, weightKg: null, dominantSide: "RIGHT" },
    currentGti: initialGti,
    wearableScore: 50,
    matchPerfScore: 85,
    posturePoints: 0,
    biomechanicalScore: 0,
    identityStatus: "VERIFIED",
    sportRecords: [],
    allBadges: [],
    ...overrides,
  });
  render(
    <QueryClientProvider client={client}>
      <SportsPassportCard />
    </QueryClientProvider>,
  );
}

it("shows a genuine zero GTI and zero components immediately after recalculation", async () => {
  state.recalculate.mockResolvedValue({
    gti: 0,
    biomechanicalScore: 0,
    wearableScore: 0,
    matchPerformanceScore: 0,
  });
  showPassport();
  fireEvent.click(screen.getByRole("button", { name: "Recalculate GTI & show breakdown" }));
  await waitFor(() =>
    expect(screen.getByRole("meter", { name: "Composite GTI" })).toHaveAttribute(
      "aria-valuenow",
      "0",
    ),
  );
  const profile = client.getQueryData<AthletePassport>(["passport", state.id, state.id, "ATHLETE"]);
  expect(profile?.currentGti).toBe(0);
  expect(profile?.wearableScore).toBe(0);
  expect(profile?.matchPerfScore).toBe(0);
});

it("uses the backend's finite onboarding baseline and preserves the previous score for a nonfinite result", async () => {
  state.recalculate.mockResolvedValueOnce({
    gti: 30,
    calculationMode: "ONBOARDING_BASELINE",
    watchQualified: false,
    biomechanicalCap: 35,
    biomechanicalScore: 0,
    wearableScore: 50,
    matchPerformanceScore: 50,
  });
  showPassport(0);
  const button = screen.getByRole("button", { name: "Recalculate GTI & show breakdown" });
  fireEvent.click(button);
  await waitFor(() =>
    expect(screen.getByRole("meter", { name: "Composite GTI" })).toHaveAttribute(
      "aria-valuenow",
      "30",
    ),
  );
  await waitFor(() => expect(button).toBeEnabled());
  expect(screen.getByText(/Starting GTI: 30/)).toBeInTheDocument();
  expect(screen.getByText(/Biomechanical Form is capped at 35/)).toBeInTheDocument();
  state.recalculate.mockResolvedValueOnce({
    gti: Number.NaN,
    biomechanicalScore: 0,
    wearableScore: Number.NaN,
    matchPerformanceScore: Number.NaN,
  });
  fireEvent.click(button);
  await waitFor(() => expect(state.recalculate).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(button).toBeEnabled());
  expect(screen.getByRole("meter", { name: "Composite GTI" })).toHaveAttribute(
    "aria-valuenow",
    "30",
  );
});
