import { readFile } from "node:fs/promises";
import type { PolicyReport } from "../../src/features/regional/policy-report";
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
  await expect(page).toHaveURL(
    new RegExp(`/${role === "admin" ? "admin" : role === "policy" ? "scout" : role}$`),
  );
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
  await page.getByRole("link", { name: "View athlete passport" }).first().click();
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

test("scout feed labels underrepresentation and lazily opens an authorized passport inspector", async ({
  page,
}) => {
  const paths: string[] = [];
  page.on("request", (request) => paths.push(new URL(request.url()).pathname));
  await login(page, "scout");
  await page.goto("/scout/feed");
  await expect(page.getByText("88.5", { exact: true })).toBeVisible();
  await expect(page.getByText("90.0", { exact: true })).toBeVisible();
  expect(paths.filter((path) => path.startsWith("/api/backend/passport/"))).toHaveLength(0);
  await page.getByRole("checkbox", { name: "Underrepresented athletes in loaded pages" }).check();
  await expect(page.getByText("90.0", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Inspect athlete passport", exact: true }).click();
  const inspector = page.getByRole("dialog");
  await expect(inspector.getByText("VERIFIED", { exact: true })).toBeVisible();
  await expect(
    inspector.getByRole("heading", { name: "Full scout dossier", exact: true }),
  ).toBeVisible();
  await expect(inspector.getByRole("button", { name: "Offer academy trial" })).toBeDisabled();
  await expect(inspector.getByRole("button", { name: "Bookmark to shortlist" })).toBeDisabled();
  expect(paths.some((path) => path.endsWith("/dossier"))).toBe(false);
  await page.setViewportSize({ width: 360, height: 800 });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/scout-inspector-mobile.png", fullPage: true });
  await page.keyboard.press("Escape");
  await expect(inspector).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Inspect athlete passport", exact: true }),
  ).toBeFocused();
});

test("talent alert acknowledgement preserves projection data and applies actual filters", async ({
  page,
}) => {
  await login(page, "scout");
  await page.goto("/scout/feed");
  await page.getByRole("tab", { name: "Talent alerts", exact: true }).click();
  await expect(page.locator("time")).toHaveAttribute("datetime", "2026-10-30T12:00:00.000Z");
  const acknowledged = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().endsWith(`/api/backend/scouts/alerts/${ids.alert}/acknowledge`),
  );
  await page.getByRole("button", { name: "Acknowledge", exact: true }).click();
  const response = await acknowledged;
  expect(response.status()).toBe(200);
  expect(response.request().postData()).toBe("{}");
  expect(response.request().headers()["idempotency-key"]).toMatch(/^[0-9a-f-]{36}$/);
  await expect(page.getByRole("button", { name: "Acknowledged", exact: true })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "athlete@example.com" })).toBeVisible();
  await page.getByLabel("Alert sport", { exact: true }).selectOption("FOOTBALL");
  await page.getByRole("button", { name: "Apply alert filters", exact: true }).click();
  await expect(
    page.getByText("No talent alerts match these filters.", { exact: true }),
  ).toBeVisible();
});

test("policy heatmap layers, sortable table and exports use the same bounded aggregates", async ({
  page,
}) => {
  await login(page, "scout");
  await page.goto("/scout/heatmaps");
  await page.getByLabel("Map metric", { exact: true }).selectOption("equity");
  await expect(page.getByRole("table").getByText("Below 25% target", { exact: true })).toHaveCount(
    2,
  );
  const map = page.getByLabel("Geospatial results map");
  await expect(map.locator('path[stroke="rgb(var(--chart-critical))"]')).toHaveCount(1);
  await expect(page.getByRole("row").filter({ hasText: "Lucknow" })).toContainText("Unavailable");
  await page.getByLabel("Sort districts", { exact: true }).selectOption("female_participation_pct");
  await page.getByLabel("Sort direction", { exact: true }).selectOption("ascending");
  await expect(page.getByRole("row").nth(1)).toContainText("Meerut");
  const jsonDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export policy report (JSON)", exact: true }).click();
  const json = await jsonDownload;
  const jsonPath = await json.path();
  if (!jsonPath) throw new Error("JSON report was not downloaded.");
  const report = JSON.parse(await readFile(jsonPath, "utf8")) as PolicyReport;
  expect(report.metadata).toMatchObject({
    completeness: "unknown",
    backend_count: 4,
    exported_districts: 4,
    female_participation_planning_target: 25,
  });
  expect(report.districts[0]?.district).toBe("Meerut");
  expect(report.districts.find((district) => district.district === "Lucknow")?.latitude).toBeNull();
  const csvDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export policy report (CSV)", exact: true }).click();
  const csv = await csvDownload;
  const csvPath = await csv.path();
  if (!csvPath) throw new Error("CSV report was not downloaded.");
  const csvText = await readFile(csvPath, "utf8");
  expect(csvText).toContain('"female_participation_pct"');
  expect(csvText).toContain('"unknown"');
  expect(csvText).toContain('"Ghaziabad"');
  await page.getByLabel("Female participation planning target (%)", { exact: true }).fill("50");
  await expect(map.locator('path[stroke="rgb(var(--chart-critical))"]')).toHaveCount(2);
  await page.setViewportSize({ width: 360, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: "test-results/scout-policy-mobile.png", fullPage: true });
});

test("leaderboard lists stay unavailable while known-athlete rank lookup uses the real contract", async ({
  page,
}) => {
  const paths: string[] = [];
  page.on("request", (request) => paths.push(new URL(request.url()).pathname));
  await login(page, "scout");
  await page.goto("/scout/leaderboards");
  await expect(
    page.getByRole("heading", { name: "Leaderboard lists and top-three podium" }),
  ).toBeVisible();
  await expect(page.getByRole("combobox", { name: /Geographic scope/ })).toBeDisabled();
  await page.getByLabel("Athlete UUID", { exact: true }).fill(ids.athlete);
  await page.getByLabel("Rank sport", { exact: true }).selectOption("CRICKET");
  await page.getByLabel("Rank district (optional)", { exact: true }).fill("Varanasi");
  const rank = page.waitForRequest((request) =>
    request.url().includes(`/gti/rank/CRICKET/${ids.athlete}`),
  );
  await page.getByRole("button", { name: "Look up athlete rank", exact: true }).click();
  expect(new URL((await rank).url()).searchParams.get("district")).toBe("Varanasi");
  await expect(page.getByText("#12", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "District individual rank" })).toBeVisible();
  expect(paths.some((path) => path.endsWith("gti/leaderboards"))).toBe(false);
});

test("scout failures remain errors and empty regional data remains an empty state", async ({
  page,
}) => {
  const problem = {
    type: "about:blank",
    title: "Forbidden",
    status: 403,
    detail: "Scout feed access denied",
    instance: "",
    timestamp: new Date().toISOString(),
  };
  await page.route("**/api/backend/scouts/feed**", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/problem+json",
      body: JSON.stringify(problem),
    }),
  );
  await login(page, "scout");
  await expect(
    page.getByRole("alert").filter({ hasText: "Scout feed access denied" }),
  ).toBeVisible();
  await expect(page.getByText("No profiles in the loaded pages", { exact: false })).toHaveCount(0);
  await page.route("**/api/backend/heatmaps/regional", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, count: 0, data: [] }),
    }),
  );
  await page.goto("/scout/heatmaps");
  await expect(
    page.getByText("No regional participation data is available.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Export policy report (CSV)" })).toHaveCount(0);
});

test("a forbidden passport shows no fabricated dossier content", async ({ page }) => {
  await page.route("**/api/backend/passport/**", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/problem+json",
      body: JSON.stringify({
        type: "about:blank",
        title: "Forbidden",
        status: 403,
        detail: "Passport access denied",
        instance: "",
        timestamp: new Date().toISOString(),
      }),
    }),
  );
  await login(page, "scout");
  await page.getByRole("button", { name: "Inspect athlete passport", exact: true }).first().click();
  await expect(
    page.getByRole("dialog").getByRole("alert").filter({ hasText: "Passport access denied" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog").getByText("VERIFIED", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Offer academy trial" }),
  ).toBeDisabled();
});

test("policy accounts use the scout workspace and logout clears private passport state", async ({
  page,
}) => {
  await login(page, "policy");
  await page.goto("/scout/dashboard");
  await page.getByRole("button", { name: "Inspect athlete passport", exact: true }).first().click();
  await expect(page.getByRole("dialog").getByText("VERIFIED", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await login(page);
  await page.goto(`/scout/athletes/${ids.athlete}`);
  await expect(page.getByRole("heading", { name: "Access restricted" })).toBeVisible();
  const result = await page.request.get("/api/backend/scouts/feed?min_gti=85&limit=20");
  expect(result.status()).toBe(403);
});

test("admin dashboard and governance expose only supported account inspection", async ({
  page,
}) => {
  const paths: string[] = [];
  page.on("request", (request) => paths.push(new URL(request.url()).pathname));
  await login(page, "admin");
  await page.goto("/admin/dashboard");
  await expect(page.getByText("Unavailable", { exact: true })).toHaveCount(6);
  await page.getByRole("button", { name: "Check web session", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Web session responded for SUPER_ADMIN" }),
  ).toBeVisible();
  await page.goto("/admin/users");
  await page.getByLabel("User UUID", { exact: true }).fill(ids.athlete);
  await page.getByRole("button", { name: "Inspect user", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Account details", exact: true })).toBeVisible();
  await expect(page.getByText("ATHLETE · Active", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Verify organizer / scout", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Revoke credentials", exact: true }),
  ).toBeDisabled();
  expect(paths.some((path) => path.startsWith("/api/backend/admin/"))).toBe(false);
});

test("audit console separates missing ledgers without fabricating records", async ({ page }) => {
  await login(page, "admin");
  await page.goto("/admin/audit-logs");
  for (const [value, title] of [
    ["identity", "Identity and anti-account-reset audit"],
    ["drills", "Edge-AI HMAC and replay audit"],
    ["sandbagging", "Anti-sandbagging enforcement audit"],
    ["safety", "Autonomous safety incident registry"],
  ]) {
    if (!value || !title) throw new Error("Audit fixture missing");
    await page.getByLabel("Audit stream", { exact: true }).selectOption(value);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Athlete UUID" })).toBeDisabled();
  await page.setViewportSize({ width: 360, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("theme studio persists safe color overrides and copies an actual CSS palette", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await login(page, "admin");
  await page.goto("/admin/theme");
  const main = page.getByRole("main");
  for (const name of ["Golden Crimson", "Royal Emerald", "Midnight Cyber", "Light Stadium"]) {
    await main.getByRole("button", { name, exact: true }).click();
    await expect(main.getByRole("button", { name, exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await Promise.allSettled(
        document
          .getAnimations()
          .filter((animation) =>
            Number.isFinite(animation.effect?.getComputedTiming().iterations ?? Infinity),
          )
          .map((animation) => animation.finished),
      );
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  await page.getByLabel("Primary accent color", { exact: true }).evaluate((element) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Native input setter unavailable");
    setter.call(element, "#123456");
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
      ),
    )
    .toBe("18 52 86");
  await page.reload();
  await expect(page.getByLabel("Primary accent color", { exact: true })).toHaveValue("#123456");
  await page.getByRole("button", { name: "Copy globals.css Config", exact: true }).click();
  await expect(page.getByText("CSS palette copied.", { exact: false })).toBeVisible();
  const css = await page.evaluate(() => navigator.clipboard.readText());
  expect(css).toContain("--kheleo-gold-primary: #123456;");
  expect(css).toContain("--kheleo-gold-rgb: 18 52 86;");
  expect(css).toContain("color-scheme: light;");
  await page.getByRole("button", { name: "Reset custom colors", exact: true }).click();
  await expect(page.getByLabel("Primary accent color", { exact: true })).toHaveValue("#925600");
  await page.setViewportSize({ width: 360, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/admin-theme-mobile.png", fullPage: true });
});

test("admin routes and known-user reads reject lower roles", async ({ page }) => {
  await login(page, "scout");
  for (const path of ["/admin/dashboard", "/admin/users", "/admin/audit-logs", "/admin/theme"]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "Access restricted", exact: true }),
    ).toBeVisible();
  }
  expect((await page.request.get(`/api/backend/users/${ids.athlete}`)).status()).toBe(403);
});

test("search requests settle for 300 ms and retain exact filter names", async ({ page }) => {
  await login(page, "scout");
  await page.goto("/scout/feed");
  await page.getByLabel("District", { exact: true }).fill("Varanasi");
  const requested = page.waitForRequest(
    (request) =>
      request.url().includes("/api/backend/scouts/feed") &&
      new URL(request.url()).searchParams.get("district") === "Varanasi",
  );
  const start = Date.now();
  await page.getByRole("button", { name: "Apply talent filters", exact: true }).click();
  const request = await requested;
  expect(Date.now() - start).toBeGreaterThanOrEqual(250);
  expect(new URL(request.url()).searchParams.get("min_gti")).toBe("85");
  expect(new URL(request.url()).searchParams.get("limit")).toBe("20");
});

test("unknown routes offer styled recovery to the public application", async ({ page }) => {
  await page.goto("/this-route-does-not-exist");
  await expect(page.getByRole("heading", { name: "Page not found", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Return to KheLEO", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Potential is");
});

test("theme changes remain usable when browser preference storage rejects writes", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("kheleo-theme-preset", "kheleo-gold-crimson");
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string): void {
      if (key.startsWith("kheleo-theme"))
        throw new DOMException("Storage blocked", "QuotaExceededError");
      original.call(this, key, value);
    };
  });
  await login(page, "admin");
  await page.goto("/admin/theme");
  await page.getByRole("main").getByRole("button", { name: "Light Stadium", exact: true }).click();
  await expect(
    page.getByRole("main").getByRole("button", { name: "Light Stadium", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("status").filter({ hasText: "Browser storage is unavailable" }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
    .toBe("light-stadium");
  await page.getByLabel("Primary accent color", { exact: true }).evaluate((element) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Native input setter unavailable");
    setter.call(element, "#123456");
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
      ),
    )
    .toBe("18 52 86");
});
