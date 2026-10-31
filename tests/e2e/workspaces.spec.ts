import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ids } from "../../src/test/factories";
async function login(page: Page, role = "athlete"): Promise<void> {
  await page.goto("/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${role}+${crypto.randomUUID()}@example.com`);
  await page.getByLabel("Government document").selectOption("AADHAAR");
  await page.getByLabel("Government ID number").fill("12345678");
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page).toHaveURL(new RegExp(`/${role === "admin" ? "admin" : role}$`));
}
test.beforeEach(async ({ request }) => {
  await request.post("http://localhost:4100/__control__/reset");
});
test("landing and mobile authentication are accessible without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Potential is");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: "test-results/landing-mobile.png", fullPage: true });
  await page.goto("/login");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
test("rejects bad credentials and protects direct workspace access", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email", { exact: true }).fill("athlete@example.com");
  await page.getByLabel("Government document").selectOption("AADHAAR");
  await page.getByLabel("Government ID number").fill("wrong-proof");
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Invalid login credentials" }),
  ).toBeVisible();
  await login(page);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Access restricted" })).toBeVisible();
});
test("passport, mobile navigation, logout, and cache isolation", async ({ page }) => {
  await login(page);
  await expect(page.getByText("72.5", { exact: false }).first()).toBeVisible();
  await page.screenshot({ path: "test-results/athlete-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 360, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Identity", exact: true }).click();
  await expect(page.getByRole("heading", { name: "One athlete. One identity." })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/athlete/passport");
  await expect(page).toHaveURL(/\/login$/);
});
test("missing passport offers creation instead of generic failure", async ({ page, request }) => {
  await request.post("http://localhost:4100/__control__/no-profile");
  await login(page);
  await expect(page.getByRole("heading", { name: "Create your sports passport" })).toBeVisible();
});
test("anti-sandbagging conflict exposes the real suggested bracket", async ({ page }) => {
  await login(page);
  await page.goto(`/athlete/tournaments/${ids.tournament}/brackets/${ids.bracket}`);
  await page.getByRole("button", { name: "Register for this bracket" }).click();
  await page.getByRole("button", { name: "Confirm registration" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Anti-Sandbagging Fair-Play Shield" }),
  ).toBeVisible();
  await expect(page.getByText("Recommended bracket: GOLD")).toBeVisible();
  await page.getByRole("button", { name: "Upgrade & Register in Recommended Bracket" }).click();
  await expect(page.getByRole("heading", { name: "Registration confirmed" })).toBeVisible();
  await expect(page.getByText(`Reference: ${ids.registration}`)).toBeVisible();
});
test("free-agent roster arrives over the real Socket.IO client", async ({ page, request }) => {
  await login(page);
  await page.goto(`/athlete/tournaments/${ids.tournament}/brackets/${ids.bracket}/pool`);
  await page.getByLabel("Primary role", { exact: true }).selectOption("BOWLER");
  await page.getByRole("button", { name: "Join free-agent pool" }).click();
  await expect(page.getByRole("heading", { name: "Queue position 1" })).toBeVisible();
  await expect(page.getByText("Live connection", { exact: true })).toBeVisible();
  await request.post("http://localhost:4100/__control__/match");
  await expect(page.getByRole("heading", { name: "Your roster is ready" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "FA-Roster-TEST" })).toHaveCount(1);
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          (await (await request.get("http://localhost:4100/__control__/sockets")).json()) as {
            matchmaking: number;
          }
        ).matchmaking,
    )
    .toBe(0);
});
test("organizer can create an event through the validated relay", async ({ page }) => {
  await login(page, "organizer");
  await page.getByRole("link", { name: "Create tournament", exact: false }).last().click();
  await page.getByLabel("Tournament name").fill("Varanasi Grassroots Cup");
  await page.getByLabel("Sport", { exact: true }).selectOption("CRICKET");
  await page.getByLabel("Registration deadline").fill("2027-01-01T12:00");
  await page.getByLabel("Start date").fill("2027-01-05T12:00");
  await page.getByLabel("End date").fill("2027-01-10T12:00");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Venue name").fill("Sigra Stadium");
  await page.getByLabel("Venue latitude").fill("25.3176");
  await page.getByLabel("Venue longitude").fill("82.9739");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const created = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" && response.url().endsWith("/api/backend/tournaments"),
  );
  await page.getByRole("button", { name: "Create tournament", exact: true }).click();
  expect((await created).request().postDataJSON()).toMatchObject({
    name: "Varanasi Grassroots Cup",
    sport: "CRICKET",
    venueLat: 25.3176,
    venueLng: 82.9739,
    teamSize: 11,
    maxTeams: 16,
  });
  await expect(page).toHaveURL(`/organizer/tournaments/${ids.tournament}`);
  await expect(page.getByRole("heading", { name: "Varanasi Grassroots Cup" })).toBeVisible();
});
test("admin tools clearly display dependencies", async ({ page }) => {
  await login(page, "admin");
  await expect(page.getByRole("heading", { name: "Platform administration" })).toBeVisible();
  await page.goto("/admin/security-audit");
  await expect(page.getByText("Persistent HMAC rejection", { exact: false })).toBeVisible();
});

test("scout feed, authorized passport, and regional table use actual wire projections", async ({
  page,
}) => {
  await login(page, "scout");
  await page.goto("/scout/prospects");
  await expect(page.getByText("88.5", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "View athlete passport" }).click();
  await expect(page.getByText("CRICKET", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Full scout dossier" })).toBeVisible();
  await page.goto("/scout/regional");
  await expect(page.getByRole("table")).toContainText("Varanasi");
  await expect(page.getByRole("cell", { name: "42.0%" })).toBeVisible();
});
test("simulator is labeled, reports critical thresholds, and sends no production telemetry", async ({
  page,
  request,
}) => {
  await login(page);
  await page.goto("/athlete/wearable");
  await page.getByRole("button", { name: "Pair virtual Galaxy Watch" }).click();
  await page.getByRole("button", { name: "Simulate critical" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "SIMULATED CRITICAL READING" }),
  ).toBeVisible();
  await expect(page.getByText("Simulated data", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Disconnect / stop" }).click();
  await expect(page.getByText("Source stopped.", { exact: false })).toBeVisible();
  const response = await request.get("http://localhost:4100/__control__/mutations");
  expect(await response.json()).not.toContain("POST safety/telemetry-webhook");
});
test("pose worker initializes from local assets and releases camera and worker", async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  await context.grantPermissions(["camera"]);
  await login(page);
  await page.goto("/athlete/drills/movement-check");
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.getByRole("button", { name: "Start camera" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Step back until" })).toBeVisible({
      timeout: 30000,
    });
    const track = await page
      .locator("video")
      .evaluateHandle(
        (video: HTMLVideoElement) => (video.srcObject as MediaStream).getVideoTracks()[0]!,
      );
    await expect(page.getByRole("button", { name: "Awaiting scoring calibration" })).toBeDisabled();
    await page.getByRole("button", { name: "Stop", exact: true }).click();
    await expect.poll(() => track.evaluate((item) => item.readyState)).toBe("ended");
    await expect.poll(() => page.workers().length).toBe(0);
  }
});

test("athlete data screens meet accessibility and mobile overflow checks", async ({ page }) => {
  await login(page);
  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of ["/athlete", "/athlete/passport", "/athlete/settings", "/athlete/wearable"]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});
test("theme tokens update component colors and safety stream stays gated", async ({ page }) => {
  await login(page, "organizer");
  await page.goto(`/organizer/tournaments/${ids.tournament}/safety`);
  await expect(
    page.getByRole("heading", { name: "Safety stream awaiting isolation verification" }),
  ).toBeVisible();
  await page.evaluate(() =>
    document.documentElement.style.setProperty("--kheleo-gold-rgb", "100 200 150"),
  );
  const color = await page
    .locator(".eyebrow")
    .first()
    .evaluate((element) => getComputedStyle(element).color);
  expect(color).toBe("rgb(100, 200, 150)");
});

test("athlete dashboard exposes live GTI analysis and an actual access-controlled QR", async ({
  page,
}) => {
  await login(page);
  await page.goto("/athlete/dashboard");
  await expect(
    page.getByRole("heading", { name: "Welcome to your Sports Passport" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Recalculate GTI & show breakdown" }).click();
  await expect(page.getByText("Contribution 28.00", { exact: true })).toBeVisible();
  await expect(page.getByText("Contribution 17.50", { exact: true })).toBeVisible();
  await expect(page.getByText("Contribution 27.00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Share passport link" }).click();
  await expect(page.getByRole("img", { name: "Authorized athlete passport QR" })).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText(`/scout/athletes/${ids.athlete}`);
  await expect(page.getByRole("dialog")).toContainText("Recipients must sign in");
});
test("manual campus discovery and role-aware standalone matchmaking use real IDs", async ({
  page,
}) => {
  await login(page);
  await page.goto("/athlete/tournaments");
  await expect(page.getByLabel("Latitude", { exact: true })).toHaveValue("28.6692");
  await expect(page.getByLabel("Longitude", { exact: true })).toHaveValue("77.4538");
  await page.getByLabel("Search radius", { exact: true }).fill("100");
  await page.getByRole("button", { name: "Find nearby tournaments" }).click();
  await expect(page.getByRole("heading", { name: "Varanasi Grassroots Cup" })).toBeVisible();
  await page.goto(`/athlete/matchmaking?tournamentId=${ids.tournament}&bracketId=${ids.bracket}`);
  await expect(page.getByLabel("Primary role", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Primary role", { exact: true }).locator("option")).toContainText([
    "Select…",
    "BATSMAN",
    "BOWLER",
    "WICKETKEEPER",
    "ALL ROUNDER",
  ]);
});
test("capacity errors never become fake registrations or fair-play violations", async ({
  page,
}) => {
  await login(page);
  await page.goto(`/athlete/tournaments/${ids.tournament}/brackets/${ids.higher}`);
  await page.route(
    `**/api/backend/tournaments/${ids.tournament}/brackets/${ids.higher}/register`,
    (route) =>
      route.fulfill({
        status: 409,
        contentType: "application/problem+json",
        body: JSON.stringify({
          type: "about:blank",
          title: "Conflict",
          status: 409,
          detail: "Bracket capacity is full",
          instance: "",
          timestamp: "now",
        }),
      }),
  );
  await page.getByRole("button", { name: "Register for this bracket" }).click();
  await page.getByRole("button", { name: "Confirm registration" }).first().click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Bracket capacity is full" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Registration confirmed" })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Anti-Sandbagging Fair-Play Shield" }),
  ).toHaveCount(0);
});
test("signup and identity aliases do not accept forged demo cookies", async ({ page, context }) => {
  await context.addCookies([
    { name: "kheleo_demo_role", value: "SUPER_ADMIN", domain: "localhost", path: "/" },
  ]);
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create your athlete account" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Quick Demo Sign-In" })).toHaveCount(0);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/verify-identity");
  await expect(page).toHaveURL(/\/login$/);
});
test("all four sport presets are reachable without submitting camera frames", async ({ page }) => {
  await login(page);
  await page.goto("/athlete/drills");
  for (const name of [
    "Cricket bowling",
    "Badminton smash",
    "Football strike",
    "Athletics sprint start",
  ])
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page.getByRole("link", { name: /Cricket bowling/ }).click();
  await expect(page.getByRole("button", { name: "Start camera" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Awaiting scoring calibration" })).toBeDisabled();
});

test("sport editor sends roles and self-reported stance through the authenticated relay", async ({
  page,
}) => {
  await login(page);
  await page.goto("/athlete/passport");
  await page.getByLabel("Select sport", { exact: true }).selectOption("FOOTBALL");
  await page.getByLabel("Primary role", { exact: true }).selectOption("FORWARD");
  await page.getByLabel("Secondary role", { exact: true }).selectOption("MIDFIELDER");
  await page.getByLabel("Self-reported stance").selectOption("LEFT_FOOT");
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().endsWith(`/api/backend/passport/${ids.athlete}/sports`),
  );
  await page.getByRole("button", { name: "Save sport roles", exact: true }).click();
  const response = await saved;
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON()).toEqual({
    sport: "FOOTBALL",
    primaryRole: "FORWARD",
    secondaryRoles: ["MIDFIELDER"],
    verifiedMetrics: { stance: "LEFT_FOOT" },
  });
  expect(response.request().headers()["idempotency-key"]).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
});

test("organizer KPIs and unsupported management tools never invent data or actions", async ({
  page,
}) => {
  await login(page, "organizer");
  await page.goto("/organizer/dashboard");
  await expect(page.getByText("Unavailable", { exact: true })).toHaveCount(5);
  await page.goto(`/organizer/brackets?tournamentId=${ids.tournament}`);
  await expect(
    page.getByRole("heading", { name: "Verified rosters and free-agent queue inspector" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Anti-sandbagging audit log" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Fixtures and verified match results" }),
  ).toBeVisible();
  await page.goto(`/organizer/tournaments/${ids.tournament}/edit`);
  await expect(page.getByText("Awaiting platform support", { exact: true })).toBeVisible();
  await page.goto("/organizer/tournaments");
  await expect(page.getByLabel("Tournament UUID")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create tournament", exact: true }).last(),
  ).toBeVisible();
});

test("venue pin and GTI range controls share the wizard draft and validate chronology", async ({
  page,
}) => {
  await login(page, "organizer");
  await page.goto("/organizer/tournaments/create");
  await page.getByLabel("Tournament name").fill("Campus fair play cup");
  await page.getByLabel("Registration deadline").fill("2027-01-05T12:00");
  await page.getByLabel("Start date").fill("2027-01-01T12:00");
  await page.getByLabel("End date").fill("2027-01-10T12:00");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "chronological" })).toBeVisible();
  await page.getByLabel("Start date").fill("2027-01-06T12:00");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Venue name").fill("Campus sports field");
  const latitude = page.getByLabel("Venue latitude", { exact: true });
  await expect(latitude).toHaveValue("28.6692");
  const map = page.getByLabel("Venue location picker");
  await expect(map.locator(".leaflet-container")).toBeVisible();
  const box = await map.boundingBox();
  if (!box) throw new Error("Venue map has no bounds.");
  await map.click({ position: { x: box.width * 0.7, y: box.height * 0.7 } });
  await expect(latitude).not.toHaveValue("28.6692");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("slider", { name: "Minimum GTI slider", exact: true }).fill("80");
  await page.getByRole("slider", { name: "Maximum GTI slider", exact: true }).fill("60");
  await expect(page.getByRole("spinbutton", { name: "Minimum GTI", exact: true })).toHaveValue(
    "80",
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Minimum GTI cannot exceed maximum" }),
  ).toBeVisible();
  await page.getByRole("spinbutton", { name: "Maximum GTI", exact: true }).fill("100");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 360, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("bracket draft removal and transient retries preserve a logical operation", async ({
  page,
}) => {
  await login(page, "organizer");
  await page.goto(`/organizer/tournaments/${ids.tournament}/brackets/new`);
  await page.getByRole("button", { name: "Add elite open", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove unsaved tier", exact: true })).toHaveCount(
    2,
  );
  await page.getByRole("button", { name: "Remove unsaved tier", exact: true }).last().click();
  const attempts: Array<{ id: string | undefined; body: string | null }> = [];
  await page.route(`**/api/backend/tournaments/${ids.tournament}/brackets`, async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    attempts.push({
      id: route.request().headers()["idempotency-key"],
      body: route.request().postData(),
    });
    if (attempts.length === 1)
      await route.fulfill({
        status: 503,
        contentType: "application/problem+json",
        body: JSON.stringify({
          type: "about:blank",
          title: "Unavailable",
          status: 503,
          detail: "Transient bracket service failure",
          instance: "",
          timestamp: new Date().toISOString(),
        }),
      });
    else await route.continue();
  });
  await page.getByRole("button", { name: "Create bracket", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Transient bracket service failure" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create bracket", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Bracket created" })).toBeVisible();
  expect(attempts).toHaveLength(2);
  expect(attempts[1]).toEqual(attempts[0]);
  expect(JSON.parse(attempts[0]?.body ?? "{}") as unknown).toEqual({
    name: "Grassroots Beginner",
    tierName: "TIER_3",
    minGti: 0,
    maxGti: 40,
    entryFee: 0,
    maxTeams: 16,
    bracketType: "SINGLE_ELIMINATION",
  });
  await expect(page.getByRole("button", { name: "Remove unsaved tier", exact: true })).toHaveCount(
    0,
  );
});

test("local emergency preview records seen time and releases opted-in audio without ingesting telemetry", async ({
  page,
  request,
}) => {
  await page.addInitScript(() => {
    const counts = { started: 0, stopped: 0, closed: 0 };
    Object.assign(window, { __safetyAudio: counts });
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      override createOscillator(): OscillatorNode {
        const oscillator = super.createOscillator();
        const start = oscillator.start.bind(oscillator);
        const stop = oscillator.stop.bind(oscillator);
        oscillator.start = (...args: Parameters<OscillatorNode["start"]>) => {
          counts.started++;
          start(...args);
        };
        oscillator.stop = (...args: Parameters<OscillatorNode["stop"]>) => {
          counts.stopped++;
          stop(...args);
        };
        return oscillator;
      }
      override close(): Promise<void> {
        counts.closed++;
        return super.close();
      }
    };
  });
  await login(page, "organizer");
  await page.goto(`/organizer/safety?tournamentId=${ids.tournament}`);
  await page.getByRole("button", { name: "Enable audible alerts", exact: true }).click();
  await page
    .getByRole("button", { name: "Simulate Critical Field Emergency", exact: true })
    .click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("SIMULATED critical biometric alert");
  await expect(dialog).toContainText("No match ID was supplied");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __safetyAudio: { started: number } }).__safetyAudio.started,
      ),
    )
    .toBe(1);
  await page.setViewportSize({ width: 360, height: 800 });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: "test-results/organizer-emergency-mobile.png", fullPage: true });
  await dialog.getByRole("button", { name: "Mark seen in this browser", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("table")).toContainText("SIMULATED");
  await expect(page.getByRole("table")).not.toContainText("Not seen");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __safetyAudio: { stopped: number } }).__safetyAudio.stopped,
      ),
    )
    .toBe(1);
  const mutations = (await (
    await request.get("http://localhost:4100/__control__/mutations")
  ).json()) as string[];
  expect(mutations.some((entry) => entry.includes("safety/telemetry"))).toBe(false);
  expect(
    (
      (await (await request.get("http://localhost:4100/__control__/sockets")).json()) as {
        events: number;
      }
    ).events,
  ).toBe(0);
  await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __safetyAudio: { closed: number } }).__safetyAudio.closed,
      ),
    )
    .toBe(1);
});

test("organizer ownership and athlete role gates protect management actions", async ({
  page,
  request,
}) => {
  await login(page, "organizer");
  await request.post("http://localhost:4100/__control__/foreign-owner");
  await page.goto(`/organizer/tournaments/${ids.tournament}/safety`);
  await expect(page.getByRole("heading", { name: "Event owner access required" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Simulate Critical Field Emergency" })).toHaveCount(
    0,
  );
  const result = await page.request.post(`/api/backend/tournaments/${ids.tournament}/brackets`, {
    headers: { origin: "http://localhost:3001", "Idempotency-Key": crypto.randomUUID() },
    data: { name: "Foreign tier", tierName: "OPEN", minGti: 0, maxGti: 100 },
  });
  expect(result.status()).toBe(403);
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page);
  await page.goto("/organizer/tournaments/create");
  await expect(page.getByRole("heading", { name: "Access restricted" })).toBeVisible();
});
