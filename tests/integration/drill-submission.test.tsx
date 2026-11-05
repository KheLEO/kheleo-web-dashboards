import { webcrypto } from "node:crypto";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { browserClient } from "@/lib/api/browser-client";
import { PracticeSubmission } from "@/features/drills/practice-submission";
import { calibratedSession } from "../fixtures/pose";
vi.mock("@/features/auth/session-provider", () => ({
  useSession: () => ({
    user: { id: "10000000-0000-4000-8000-000000000001" },
    capabilities: { drillPracticeIngestion: true },
  }),
}));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("submits a validated session with its browser digest and decodes the backend's bare result", async () => {
  vi.stubGlobal("crypto", webcrypto);
  const send = vi.spyOn(browserClient, "request").mockResolvedValue({
    data: { success: true, posture_points_awarded: 400, current_biomechanical_score: 40 },
  });
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PracticeSubmission summary={calibratedSession()} />
    </QueryClientProvider>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Submit drill for practice points" }));
  expect(await screen.findByText(/Drill accepted. Posture Practice Points: 400/)).toBeVisible();
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({
      url: "/backend/drills/submit",
      headers: expect.objectContaining({
        "x-client-pose-digest": expect.stringMatching(/^[a-f\d]{64}$/),
      }),
    }),
  );
});
