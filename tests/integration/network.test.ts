import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { getPassport } from "@/features/passport/api";
import { ids } from "@/test/factories";
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
it("validates the real wrapped passport shape over Axios", async () => {
  const passport = await getPassport(ids.athlete);
  expect(passport.currentGti).toBe(72.5);
});
it("preserves RFC7807 business errors from Axios", async () => {
  server.use(
    http.get("*/api/backend/passport/:userId", () =>
      HttpResponse.json(
        {
          type: "about:blank",
          title: "Not found",
          status: 404,
          detail: "Passport not found",
          instance: "",
          timestamp: "now",
        },
        { status: 404 },
      ),
    ),
  );
  await expect(getPassport(ids.athlete)).rejects.toMatchObject({
    problem: { status: 404, detail: "Passport not found" },
  });
});
