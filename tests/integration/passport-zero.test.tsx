import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

it("labels the unmeasured onboarding baseline without implying a 32.50 component sum", () => {
  showPassport(30, { matchPerfScore: 50 });
  expect(screen.getByText(/Onboarding baseline: 30.0 GTI/)).toBeVisible();
  expect(screen.getAllByText("Contribution — unmeasured")).toHaveLength(3);
  expect(screen.queryByText("Contribution 12.50")).not.toBeInTheDocument();
  expect(screen.queryByText("Contribution 20.00")).not.toBeInTheDocument();
  expect(
    within(screen.getByRole("group", { name: "Wearable Consistency" })).getByText("50.0"),
  ).toBeVisible();
});

it("uses effective partial-evidence weights and components returned by recalculation", async () => {
  state.recalculate.mockResolvedValueOnce({
    gti: 70,
    biomechanicalScore: 80,
    wearableScore: 56,
    matchPerformanceScore: 0,
    weights: { w1: 0.5833333333333334, w2: 0.4166666666666667, w3: 0 },
    calculationMode: "WEIGHTED",
  });
  showPassport(30, { matchPerfScore: 50 });
  fireEvent.click(screen.getByRole("button", { name: "Recalculate GTI & show breakdown" }));
  await waitFor(() =>
    expect(screen.getByRole("meter", { name: "Composite GTI" })).toHaveAttribute(
      "aria-valuenow",
      "70",
    ),
  );
  const biomechanical = within(screen.getByRole("group", { name: "Biomechanical Form" }));
  const wearable = within(screen.getByRole("group", { name: "Wearable Consistency" }));
  const match = within(screen.getByRole("group", { name: "Verified Match Performance" }));
  expect(biomechanical.getByText("58.33%")).toBeVisible();
  expect(biomechanical.getByText("Contribution 46.67")).toBeVisible();
  expect(wearable.getByText("Contribution 23.33")).toBeVisible();
  expect(match.getByText("0%")).toBeVisible();
  expect(match.getByText("Contribution 0.00")).toBeVisible();
  expect(screen.queryByText(/Onboarding baseline/)).not.toBeInTheDocument();
});

it("does not invent contributions when the live score has no matching breakdown", () => {
  showPassport(87);
  expect(screen.getAllByText("Contribution — recalculate")).toHaveLength(3);
  expect(screen.getByText(/retrieve current effective weights/)).toBeVisible();
});

it("uses the backend's finite onboarding baseline and preserves the previous score for a nonfinite result", async () => {
  state.recalculate.mockResolvedValueOnce({
    gti: 30,
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
