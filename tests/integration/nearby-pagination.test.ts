import { afterEach, expect, it, vi } from "vitest";
import { browserClient } from "@/lib/api/browser-client";
import { getNearby } from "@/features/tournaments/api";
import { ids, makeTournament } from "@/test/factories";
afterEach(() => vi.restoreAllMocks());
it.each([false, true])("decodes legacy arrays and cursor pages (paged=%s)", async (paged) => {
  const data = [{ ...makeTournament(), minGti: 0, maxGti: 100, prizePool: 25000, distanceKm: 1 }];
  const get = vi.spyOn(browserClient, "get").mockResolvedValue({
    data: {
      success: true,
      timestamp: "now",
      data: paged ? { data, next_cursor: ids.tournament, has_more: true } : data,
    },
  });
  const result = await getNearby({ lat: 0, lng: 0, cursor: ids.tournament, limit: 20 });
  expect(result).toMatchObject({
    data: [{ id: ids.tournament, name: data[0]!.name, distanceKm: 1 }],
    next_cursor: paged ? ids.tournament : null,
    has_more: paged,
  });
  expect(get).toHaveBeenCalledWith(
    "/backend/tournaments/nearby",
    expect.objectContaining({ params: { lat: 0, lng: 0, cursor: ids.tournament, limit: 20 } }),
  );
});
