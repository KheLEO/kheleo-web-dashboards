import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { RealtimeSubscription } from "@/lib/realtime/socket.client";
import { ids } from "@/test/factories";
const fixture = vi.hoisted(() => ({ enabled: false, subscribe: vi.fn(), cleanup: vi.fn() }));
vi.mock("@/features/auth/session-provider", () => ({
  useSession: () => ({
    user: { id: "10000000-0000-4000-8000-000000000002" },
    capabilities: { safeEvents: fixture.enabled },
  }),
}));
vi.mock("@/lib/realtime/socket.client", () => ({ subscribeNamespace: fixture.subscribe }));
import { useSafetyEvents } from "@/features/safety/use-safety-events";
afterEach(() => {
  fixture.enabled = false;
  vi.clearAllMocks();
});
it("keeps unsafe sockets off while permitting a clearly local emergency preview", () => {
  const hook = renderHook(() => useSafetyEvents(ids.tournament));
  expect(fixture.subscribe).not.toHaveBeenCalled();
  act(() => hook.result.current.simulate());
  expect(hook.result.current.unseen?.source).toBe("SIMULATED");
  expect(hook.result.current.unseen?.alert.match_id).toBeUndefined();
  act(() => hook.result.current.markSeen());
  expect(hook.result.current.unseen).toBeNull();
  expect(hook.result.current.incidents[0]?.seenAt).toEqual(expect.any(Number));
  hook.unmount();
});
it("filters unrelated tournaments, deduplicates delivery and cleans up authorized subscriptions", async () => {
  fixture.enabled = true;
  fixture.subscribe.mockReturnValue(fixture.cleanup);
  const hook = renderHook(() => useSafetyEvents(ids.tournament));
  expect(fixture.subscribe).toHaveBeenCalledWith(
    "/ws/events",
    expect.objectContaining({ rooms: [{ event: "join:tournament", id: ids.tournament }] }),
  );
  const subscription = fixture.subscribe.mock.calls[0]?.[1] as RealtimeSubscription;
  const alert = {
    event: "MATCH_PAUSE_ALERT",
    severity: "CRITICAL",
    athlete_id: ids.athlete,
    athlete_name: "Player",
    tournament_id: ids.tournament,
    vitals: { heart_rate: 196, spo2: 90, skin_temperature: 39.5 },
    directive: "Mandatory rest",
  };
  act(() => {
    subscription.events.MATCH_PAUSE_ALERT?.({ ...alert, tournament_id: ids.higher });
    subscription.events.MATCH_PAUSE_ALERT?.(alert);
    subscription.events.MATCH_PAUSE_ALERT?.(alert);
  });
  await waitFor(() => expect(hook.result.current.incidents).toHaveLength(1));
  expect(hook.result.current.unseen?.source).toBe("LIVE");
  hook.unmount();
  expect(fixture.cleanup).toHaveBeenCalledOnce();
});
