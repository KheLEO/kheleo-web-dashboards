import { readFile } from "node:fs/promises";
import type { PolicyReport } from "../../src/features/regional/policy-report";
import { test, expect, devices, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ids } from "../../src/test/factories";
import { navigation } from "../../src/components/shell/persona-navigation";
import type { Workspace } from "../../src/server/auth/permissions";

const missionRoutes: Record<Workspace, ReadonlyArray<{ path: string; heading: string }>> = {
  athlete: [
    { path: "/athlete/dashboard", heading: "Welcome to your Sports Passport" },
    { path: "/athlete/passport", heading: "Your permanent sports identity" },
    { path: "/athlete/tournaments", heading: "Find your next arena" },
    { path: "/athlete/matchmaking", heading: "Solo Free-Agent Pool" },
    { path: "/athlete/drills", heading: "Edge-AI Pose Drills — Under Production" },
    { path: "/athlete/iot-device", heading: "IoT Wearable Telemetry — Under Production" },
    { path: "/verify-identity", heading: "One athlete. One identity." },
  ],
  organizer: [
    { path: "/organizer/dashboard", heading: "Make every match count" },
    { path: "/organizer/tournaments", heading: "Your tournaments" },
    { path: "/organizer/tournaments/create", heading: "Create a tournament" },
    { path: "/organizer/brackets", heading: "Brackets and registrations" },
    { path: "/organizer/safety", heading: "Safety command center" },
  ],
  scout: [
    { path: "/scout/dashboard", heading: "Discover the next generation" },
    { path: "/scout/leaderboards", heading: "National, state, and district leaderboards" },
    { path: "/scout/feed", heading: "Talent discovery feed" },
    { path: "/scout/heatmaps", heading: "Opportunity, on the map" },
  ],
  admin: [
    { path: "/admin/dashboard", heading: "Platform administration" },
    { path: "/admin/users", heading: "User and organizer governance" },
    { path: "/admin/tournaments", heading: "Tournament moderation" },
    { path: "/admin/audit-logs", heading: "Security and integrity audit console" },
    { path: "/admin/theme", heading: "Live theme studio" },
  ],
};

async function login(page: Page, role = "athlete"): Promise<void> {
  await page.goto("/login");
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await page
    .getByLabel(/Email or phone number/i)
    .fill(`${role}+${crypto.randomUUID()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("securepassword123");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("securepassword123");
  const authenticated = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/session/login",
  );
  await page.getByRole("button", { name: "Sign in securely" }).click();
  expect((await authenticated).status(), "Login must establish a server session").toBe(200);
  await expect(page).toHaveURL(
    new RegExp(`/${role === "admin" ? "admin" : role === "policy" ? "scout" : role}$`),
    { timeout: 20000 },
  );
}
test.beforeEach(async ({ request }) => {
  await request.post("http://localhost:4100/__control__/reset");
});

for (const viewport of [
  { width: 360, height: 800 },
  { width: 1920, height: 1080 },
]) {
  test(`all 24 mission routes render and link correctly at ${viewport.width}px`, async ({
    page,
  }) => {
    test.setTimeout(180000);
    const runtimeErrors: string[] = [];
    const hydrationErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && /hydration|hydrating|did not match/i.test(message.text()))
        hydrationErrors.push(message.text());
    });
    await page.setViewportSize(viewport);
    for (const path of ["/", "/login", "/signup"]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      await expect(page.getByRole("main")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${path} overflows at ${viewport.width}px`,
      ).toBe(true);
    }
    await page.goto("/");
    for (const workspace of Object.keys(missionRoutes) as Workspace[]) {
      await expect(
        page.getByRole("link", {
          name: new RegExp(
            `${workspace === "admin" ? "Super admin" : workspace === "scout" ? "Scout & policy" : workspace} portal`,
            "i",
          ),
        }),
      ).toHaveAttribute("href", `/${workspace}/dashboard`);
    }
    for (const workspace of Object.keys(missionRoutes) as Workspace[]) {
      await login(page, workspace);
      for (const route of missionRoutes[workspace]) {
        const response = await page.goto(route.path);
        expect(response?.status(), route.path).toBe(200);
        await expect(
          page.getByRole("heading", { level: 1, name: route.heading, exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("status").filter({ hasText: "Loading workspace data…" }),
        ).toHaveCount(0);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `${route.path} overflows at ${viewport.width}px`,
        ).toBe(true);
        await expect(page.getByRole("heading", { name: "Something went wrong" })).toHaveCount(0);
      }
      if (viewport.width < 1024)
        await page.getByRole("button", { name: "Open navigation" }).click();
      const menu = page.getByRole("navigation", { name: `${workspace} navigation`, exact: true });
      for (const item of navigation[workspace]) {
        const link = menu.getByRole("link", { name: item.title, exact: true });
        await link.scrollIntoViewIfNeeded();
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute("href", item.href);
      }
      if (viewport.width < 1024)
        await page.getByRole("button", { name: "Close navigation" }).click();
      await page.getByRole("button", { name: "Sign out" }).click();
      await expect(page).toHaveURL(/\/login$/);
    }
    expect(runtimeErrors).toEqual([]);
    expect(hydrationErrors).toEqual([]);
  });
}

test("policy accounts can open every shared scout route and cannot enter administration", async ({
  page,
}) => {
  await login(page, "policy");
  for (const route of missionRoutes.scout) {
    await page.goto(route.path);
    await expect(
      page.getByRole("heading", { level: 1, name: route.heading, exact: true }),
    ).toBeVisible();
  }
  await page.goto("/admin/dashboard");
  await expect(page.getByRole("heading", { name: "Access restricted", exact: true })).toBeVisible();
});

test("Android touch navigation and local vitals remain usable with 4x CPU throttling", async ({
  browser,
}) => {
  const context = await browser.newContext({
    ...devices["Galaxy S9+"],
    viewport: { width: 360, height: 800 },
    deviceScaleFactor: 1,
  });
  try {
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const session = await context.newCDPSession(page);
    await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await login(page);
    await page.getByRole("button", { name: "Open navigation" }).tap();
    await page
      .getByRole("navigation", { name: "athlete navigation", exact: true })
      .getByRole("link", { name: "Wearable", exact: true })
      .tap();
    await expect(page).toHaveURL(/\/athlete\/iot-device$/);
    await expect(
      page.getByRole("heading", { name: "IoT Wearable Telemetry — Under Production" }),
    ).toBeVisible();
    await expect(page.getByText("UNDER PRODUCTION • LAUNCHING SOON")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to Sports Passport" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: "test-results/android-vitals-mobile.png", fullPage: true });
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
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
  const scripts = (url: URL): boolean =>
    url.pathname.startsWith("/_next/") && url.pathname.endsWith(".js");
  let releaseScripts: (() => void) | undefined;
  const blocked = new Promise<void>((resolve) => {
    releaseScripts = resolve;
  });
  await page.route(scripts, async (route) => {
    await blocked;
    await route.continue();
  });
  try {
    await page.goto("/login", { waitUntil: "commit" });
    await expect(page.locator('form[data-hydrated="false"]')).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Sign in securely" })).toBeDisabled();
  } finally {
    releaseScripts?.();
  }
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await page.unroute(scripts);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await page.getByLabel(/Email or phone number/i).fill("athlete@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .pressSequentially("wrong-proof", { delay: 20 });
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("wrong-proof");
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
  for (const name of ["Recalculate GTI & show breakdown", "Update primary sport and handedness"]) {
    const dimensions = await page.getByRole("button", { name, exact: true }).evaluate((button) => {
      const parent = button.parentElement;
      if (!parent) throw new Error("Passport action has no container.");
      return {
        width: button.getBoundingClientRect().width,
        parentWidth: parent.clientWidth,
        scrollWidth: button.scrollWidth,
        clientWidth: button.clientWidth,
      };
    });
    expect(dimensions.width, `${name} exceeds its content container`).toBeLessThanOrEqual(
      dimensions.parentWidth,
    );
    expect(dimensions.scrollWidth, `${name} clips its label`).toBeLessThanOrEqual(
      dimensions.clientWidth + 1,
    );
  }
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Sports passport", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your permanent sports identity" })).toBeVisible();
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
test("admin security tools display persisted rejection evidence", async ({ page }) => {
  await login(page, "admin");
  await expect(page.getByRole("heading", { name: "Platform administration" })).toBeVisible();
  await page.goto("/admin/security-audit");
  await expect(page.getByRole("table")).toContainText("Invalid drill cryptographic signature");
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
test("wearable showcase informs athletes of upcoming IoT telemetry features", async ({ page }) => {
  await login(page);
  await page.goto("/athlete/wearable");
  await expect(
    page.getByRole("heading", { name: "IoT Wearable Telemetry — Under Production" }),
  ).toBeVisible();
  await expect(page.getByText("UNDER PRODUCTION • LAUNCHING SOON")).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to Sports Passport" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore Tournaments" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("pose drills showcase informs athletes of upcoming Edge-AI features", async ({ page }) => {
  await login(page);
  await page.goto("/athlete/drills/movement-check");
  await expect(
    page.getByRole("heading", { name: "Edge-AI Pose Drills — Under Production" }),
  ).toBeVisible();
  await expect(page.getByText("UNDER PRODUCTION • LAUNCHING SOON")).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to Sports Passport" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore Tournaments" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("athlete data screens meet accessibility and mobile overflow checks", async ({ page }) => {
  await login(page);
  await page.setViewportSize({ width: 360, height: 800 });
  let releasePassport: (() => void) | undefined;
  const passportPending = new Promise<void>((resolve) => {
    releasePassport = resolve;
  });
  const passportPath = `**/api/backend/passport/${ids.athlete}`;
  await page.route(passportPath, async (route) => {
    await passportPending;
    await route.continue();
  });
  try {
    await page.goto("/athlete/dashboard");
    await expect(
      page.getByRole("status").filter({ hasText: "Loading workspace data…" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Athlete Action Hub", exact: true }),
    ).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  } finally {
    releasePassport?.();
  }
  await expect(
    page.getByRole("heading", { name: "Digital sports passport", exact: true }),
  ).toBeVisible();
  await page.unroute(passportPath);
  for (const path of [
    "/athlete",
    "/athlete/dashboard",
    "/athlete/passport",
    "/athlete/tournaments",
    "/athlete/matchmaking",
    "/athlete/drills",
    "/athlete/iot-device",
    "/athlete/settings",
    "/athlete/wearable",
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: "Loading workspace data…" }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      path,
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});
test("theme tokens update component colors with an authenticated safety stream", async ({
  page,
}) => {
  await login(page, "organizer");
  await page.goto(`/organizer/tournaments/${ids.tournament}/safety`);
  await expect(page.getByText("Live connection", { exact: true })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Quick Demo Sign-In" })).toHaveCount(0);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/verify-identity");
  await expect(page).toHaveURL(/\/login$/);
});

test("not legit badge, hover tooltip, and digilocker verification modal flow", async ({ page }) => {
  await page.goto("/login");
  await page
    .getByLabel(/Email or phone number/i)
    .fill(`athlete+not-legit-${crypto.randomUUID()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("securepassword123");
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page).toHaveURL(/\/athlete$/);

  const notLegitBadge = page.getByRole("button", { name: /Not Legit/i });
  await expect(notLegitBadge).toBeVisible();

  await notLegitBadge.hover();
  await expect(
    page.getByText(
      "You are not verified. Your government ID / Aadhaar card is not verified, so you are marked as Not Legit and scouts will not be able to see your account.",
    ),
  ).toBeVisible();

  // Verify mobile 360px width overflow safety with the tooltip open
  await page.setViewportSize({ width: 360, height: 800 });
  await notLegitBadge.hover();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await notLegitBadge.click();
  await expect(page).toHaveURL(/\/athlete\/passport#verify-account$/);

  await expect(page.locator("#verify-account")).toBeVisible();
  await expect(page.getByText("Status: Not Legit (Unverified)")).toBeVisible();

  await page.getByRole("button", { name: "Verify My Account" }).click();
  await expect(
    page.getByRole("heading", { name: "DigiLocker Integration Coming Up" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Official Government of India DigiLocker OAuth verification is coming up/i),
  ).toBeVisible();

  await page.getByRole("button", { name: "Got it" }).click();
  await expect(page.getByRole("heading", { name: "DigiLocker Integration Coming Up" })).toHaveCount(
    0,
  );
});

test("full password-based signup flow with phone normalization and direct role redirection", async ({
  page,
}) => {
  await page.goto("/signup");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();

  const uniqueSuffix = crypto.randomUUID().slice(0, 8);
  await page.getByLabel("Full name").fill("Rohan Sharma");
  await page.getByLabel("Email address").fill(`athlete+${uniqueSuffix}@example.com`);
  await page.getByLabel("Phone number").fill("9876543210");
  await page.getByLabel("Password", { exact: true }).fill("mypassword123");
  await page.getByLabel("Account role").selectOption("ATHLETE");

  const registered = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/session/register",
  );
  await page.getByRole("button", { name: "Create account" }).click();
  expect((await registered).status()).toBe(200);

  await expect(page).toHaveURL(/\/athlete$/);
  await expect(page.getByRole("status", { name: "Verified Legit Account" })).toBeVisible();
});

test("pose drills route renders under production showcase and links", async ({ page }) => {
  await login(page);
  await page.goto("/athlete/drills");
  await expect(
    page.getByRole("heading", { name: "Edge-AI Pose Drills — Under Production" }),
  ).toBeVisible();
  await expect(page.getByText("UNDER PRODUCTION • LAUNCHING SOON")).toBeVisible();
  await expect(page.getByText("100% On-Device Camera Tracking")).toBeVisible();
  await expect(page.getByText("Real-Time Joint Angle Correction")).toBeVisible();
  await expect(page.getByText("Verified GTI Posture Points")).toBeVisible();
  await page.getByRole("link", { name: "Go to Sports Passport" }).click();
  await expect(page).toHaveURL(/\/athlete\/passport$/);
});

test("sport editor sends self-reported roles without injecting verified metrics", async ({
  page,
}) => {
  await login(page);
  await page.goto("/athlete/passport");
  await page.getByLabel("Select sport", { exact: true }).selectOption("FOOTBALL");
  await page.getByLabel("Primary role", { exact: true }).selectOption("FORWARD");
  await page.getByLabel("Secondary role", { exact: true }).selectOption("MIDFIELDER");
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
  });
  expect(response.request().headers()["idempotency-key"]).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
});

test("organizer dashboard and management panels use live contracts without dependency placeholders", async ({
  page,
}) => {
  await login(page, "organizer");
  await page.goto("/organizer/dashboard");
  await expect(
    page.getByRole("group", { name: "Active tournaments hosted", exact: true }),
  ).toContainText("1");
  await expect(page.getByRole("group", { name: "Registered athletes", exact: true })).toContainText(
    "2",
  );
  await expect(
    page.getByRole("group", { name: "Configured prize pool (INR)", exact: true }),
  ).toContainText("25,000");
  await expect(page.getByText("Unavailable", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Manage Brackets/Rosters", exact: true }),
  ).toBeVisible();
  await page.goto(`/organizer/brackets?tournamentId=${ids.tournament}`);
  for (const name of [
    "Verified Roster & Registrations Inspector",
    "Free-Agent Pool Queue Monitor",
    "Anti-Sandbagging Fair-Play Block Log",
    "Match Result & Score Verification Form",
  ])
    await expect(page.getByRole("tab", { name, exact: true })).toBeVisible();
  await expect(page.getByText("Awaiting platform support", { exact: true })).toHaveCount(0);
  await page.goto(`/organizer/tournaments/${ids.tournament}/edit`);
  await expect(page.getByLabel("Tournament name", { exact: true })).toHaveValue(
    "Varanasi Grassroots Cup",
  );
  await page.goto("/organizer/tournaments");
  await expect(page.getByRole("link", { name: "Edit", exact: true })).toBeVisible();
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
    .toBeGreaterThanOrEqual(1);
  const mutations = (await (
    await request.get("http://localhost:4100/__control__/mutations")
  ).json()) as string[];
  expect(mutations.some((entry) => entry.includes("safety/telemetry"))).toBe(false);
  await expect
    .poll(async () => {
      const sockets = (await (
        await request.get("http://localhost:4100/__control__/sockets")
      ).json()) as { events: number };
      return sockets.events;
    })
    .toBe(1);
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
  await expect(
    page.getByRole("alert").filter({ hasText: "belongs to another organizer" }),
  ).toBeVisible();
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
  await expect(inspector.getByRole("button", { name: "Offer Academy Trial" })).toBeEnabled();
  await expect(inspector.getByRole("button", { name: "Bookmark to Shortlist" })).toBeEnabled();
  expect(paths.some((path) => path.endsWith("/dossier"))).toBe(true);
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
  await expect(page.getByRole("row").filter({ hasText: "Lucknow" })).toContainText(
    "No centroid recorded",
  );
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
    completeness: "complete",
    is_complete: true,
    backend_count: 5,
    exported_districts: 5,
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
  expect(csvText).toContain('"complete"');
  expect(csvText).toContain('"state"');
  expect(csvText).toContain('"Karnataka"');
  expect(
    report.districts
      .filter((row) => row.district === "Varanasi")
      .map((row) => row.state)
      .sort(),
  ).toEqual(["Karnataka", "Uttar Pradesh"]);
  expect(csvText).toContain('"Ghaziabad"');
  await page.getByLabel("Female participation planning target (%)", { exact: true }).fill("50");
  await expect(map.locator('path[stroke="rgb(var(--chart-critical))"]')).toHaveCount(2);
  await page.setViewportSize({ width: 360, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: "test-results/scout-policy-mobile.png", fullPage: true });
});

test("leaderboard lists are active while individual rank lookup remains available", async ({
  page,
}) => {
  const paths: string[] = [];
  page.on("request", (request) => paths.push(new URL(request.url()).pathname));
  await login(page, "scout");
  await page.goto("/scout/leaderboards");
  await expect(page.getByRole("heading", { name: "Top-three podium" })).toBeVisible();
  await expect(page.getByRole("button", { name: "NATIONAL", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("table")).toContainText("Prospect 01");
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
  expect(paths.some((path) => path.endsWith("gti/leaderboards"))).toBe(true);
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
      body: JSON.stringify({ success: true, count: 0, is_complete: true, data: [] }),
    }),
  );
  await page.goto("/scout/heatmaps");
  await expect(
    page.getByText("No regional participation data is available.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Export policy report (CSV)" })).toHaveCount(0);
});

test("a forbidden dossier shows no fabricated evidence or outreach controls", async ({ page }) => {
  await page.route("**/api/backend/users/*/dossier", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/problem+json",
      body: JSON.stringify({
        type: "about:blank",
        title: "Forbidden",
        status: 403,
        detail: "Dossier access denied",
        instance: "",
        timestamp: new Date().toISOString(),
      }),
    }),
  );
  await login(page, "scout");
  await page.getByRole("button", { name: "Inspect athlete passport", exact: true }).first().click();
  await expect(
    page.getByRole("dialog").getByRole("alert").filter({ hasText: "Dossier access denied" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog").getByText("VERIFIED", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Offer Academy Trial" }),
  ).toHaveCount(0);
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

test("admin dashboard shows live executive totals, relay health and the UUID inspector", async ({
  page,
}) => {
  const paths: string[] = [];
  page.on("request", (request) => paths.push(new URL(request.url()).pathname));
  await login(page, "admin");
  await page.goto("/admin/dashboard");
  for (const [label, value] of [
    ["Verified athletes", "1"],
    ["Active tournaments", "1"],
    ["Organizers and scouts", "26"],
    ["Verified Edge-AI drills", "8"],
    ["IoT safety pauses", "1"],
    ["Sandbagging blocks", "1"],
  ] as const) {
    await expect(page.getByRole("group", { name: label, exact: true })).toContainText(value!);
  }
  await expect(page.getByText("Unavailable", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Check web session", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Web session responded for SUPER_ADMIN" }),
  ).toBeVisible();
  await page.goto("/admin/users");
  await page.getByLabel("User UUID", { exact: true }).fill(ids.athlete);
  await page.getByRole("button", { name: "Inspect user", exact: true }).click();
  await expect(page.getByRole("group", { name: "Inspected account details" })).toContainText(
    "ATHLETE · Active",
  );
  expect(paths.some((path) => path === "/api/backend/admin/dashboard")).toBe(true);
  expect(paths.some((path) => path === "/api/backend/admin/users")).toBe(true);
});

test("audit console filters immutable records and opens structured metadata", async ({ page }) => {
  await login(page, "admin");
  await page.goto("/admin/audit-logs");
  const table = page.getByRole("table", { name: "Immutable platform security events" });
  await expect(table.getByRole("row")).toHaveCount(7);
  for (const [label, category] of [
    ["Gov-ID Anti-Reset", "GOV_ID_RESET"],
    ["Edge-AI HMAC Tamper", "DRILL_HMAC_TAMPER"],
    ["Anti-Sandbagging Blocks", "SANDBAGGING_BLOCKED"],
    ["IoT Safety Match Pauses", "SAFETY_MATCH_PAUSE"],
    ["Governance", "ROLE_GOVERNANCE"],
  ] as const) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(table.getByRole("row")).toHaveCount(2);
    await expect(table).toContainText(category!);
  }
  await page
    .getByLabel("Governance category", { exact: true })
    .selectOption("TOURNAMENT_MODERATION");
  await expect(table).toContainText("TOURNAMENT_MODERATION");
  await table.getByRole("button", { name: /^View metadata for / }).click();
  await expect(page.getByRole("dialog")).toContainText('"outcome": "RECORDED"');
  await page.getByRole("button", { name: "Close audit metadata", exact: true }).click();
  await page.getByLabel("Audit severity", { exact: true }).selectOption("CRITICAL");
  await expect(
    page.getByText("No security events match these filters.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "All Events", exact: true }).click();
  await expect(table.getByRole("row")).toHaveCount(3);
  await expect(page.getByRole("button", { name: /Delete audit|Edit audit/ })).toHaveCount(0);
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

test("passport loads all three weighted GTI scores before recalculation", async ({
  page,
  request,
}) => {
  await login(page);
  await page.goto("/athlete/passport");
  await expect(page.getByRole("group", { name: "Biomechanical Form", exact: true })).toContainText(
    "65.0",
  );
  await expect(page.getByRole("group", { name: "Biomechanical Form", exact: true })).toContainText(
    "35%",
  );
  await expect(
    page.getByRole("group", { name: "Wearable Consistency", exact: true }),
  ).toContainText("50.0");
  await expect(
    page.getByRole("group", { name: "Wearable Consistency", exact: true }),
  ).toContainText("25%");
  await expect(
    page.getByRole("group", { name: "Verified Match Performance", exact: true }),
  ).toContainText("50.0");
  await expect(
    page.getByRole("group", { name: "Verified Match Performance", exact: true }),
  ).toContainText("40%");
  expect(
    await (await request.get("http://localhost:4100/__control__/mutations")).json(),
  ).not.toContain(`POST gti/recalculate/${ids.athlete}`);
});

test("nearby cursor discovery retains every page beyond twenty tournaments", async ({
  page,
  request,
}) => {
  await request.post("http://localhost:4100/__control__/nearby-pages");
  await login(page);
  await page.goto("/athlete/tournaments");
  const tournaments = page.getByRole("heading", { name: /^Nearby Tournament / });
  await expect(tournaments).toHaveCount(20);
  const next = page.waitForResponse(
    (response) =>
      response.url().includes("/api/backend/tournaments/nearby?") &&
      response.url().includes("cursor="),
  );
  await page.getByRole("button", { name: "Load More Tournaments", exact: true }).click();
  expect(new URL((await next).url()).searchParams.get("cursor")).toBe(
    "30000000-0000-4000-8000-000000000020",
  );
  await expect(tournaments).toHaveCount(40);
  await page.getByRole("button", { name: "Load More Tournaments", exact: true }).click();
  await expect(tournaments).toHaveCount(45);
  await expect(
    page.getByRole("heading", { name: "Nearby Tournament 01", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Nearby Tournament 45", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Load More Tournaments", exact: true }),
  ).toHaveCount(0);
  expect(new Set(await tournaments.allTextContents()).size).toBe(45);
});

test("calibrated browser submissions cross the real signing relay and update the passport", async ({
  page,
}) => {
  const { calibratedSession } = await import("../fixtures/pose");
  const { canonicalJson } = await import("../../src/lib/canonical-json");
  await login(page);
  const submission = calibratedSession();
  const result = await page.evaluate(
    async ({ submissionJson, canonical }) => {
      const input = JSON.parse(submissionJson) as Record<string, unknown>;
      const digest = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical))),
        (byte) => byte.toString(16).padStart(2, "0"),
      ).join("");
      const send = async (
        body: Record<string, unknown>,
      ): Promise<{ status: number; body: unknown }> => {
        const response = await fetch("/api/backend/drills/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
            "x-client-pose-digest": digest,
          },
          body: JSON.stringify(body),
        });
        return { status: response.status, body: (await response.json()) as unknown };
      };
      return { valid: await send(input), forged: await send({ ...input, form_score: 100 }) };
    },
    {
      submissionJson: JSON.stringify(submission),
      canonical: canonicalJson(submission.pose_frames),
    },
  );
  expect(result.valid.status).toBe(200);
  expect(result.valid.body).toMatchObject({
    success: true,
    posture_points_awarded: 400,
    current_biomechanical_score: 40,
  });
  expect(result.forged.status).toBe(403);
  await page.goto("/athlete/passport");
  await expect(page.getByRole("group", { name: "Biomechanical Form", exact: true })).toContainText(
    "40.0",
  );
});

test("wearable route renders under production showcase and links", async ({ page }) => {
  await login(page);
  await page.goto("/athlete/wearable");
  await expect(
    page.getByRole("heading", { name: "IoT Wearable Telemetry — Under Production" }),
  ).toBeVisible();
  await expect(page.getByText("UNDER PRODUCTION • LAUNCHING SOON")).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to Sports Passport" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore Tournaments" })).toBeVisible();
});

test("iot-device route renders under production showcase and links", async ({ page }) => {
  await login(page);
  await page.goto("/athlete/iot-device");
  await expect(
    page.getByRole("heading", { name: "IoT Wearable Telemetry — Under Production" }),
  ).toBeVisible();
  await expect(page.getByText("UNDER PRODUCTION • LAUNCHING SOON")).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to Sports Passport" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore Tournaments" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("GTI_UPDATED refreshes the athlete passport without a reload", async ({ page, request }) => {
  await login(page);
  await page.goto("/athlete/passport");
  await expect(page.getByRole("group", { name: "Biomechanical Form", exact: true })).toContainText(
    "65.0",
  );
  await expect
    .poll(
      async () =>
        (
          (await (await request.get("http://localhost:4100/__control__/sockets")).json()) as {
            events: number;
          }
        ).events,
    )
    .toBe(1);
  await request.post("http://localhost:4100/__control__/gti-update");
  await expect(page.getByRole("group", { name: "Biomechanical Form", exact: true })).toContainText(
    "94.0",
  );
  await expect(page.getByRole("meter", { name: "Composite GTI" })).toHaveAttribute(
    "aria-valuenow",
    "65.4",
  );
});

test("organizer can save populated event edits with custom role quotas and prize allocation", async ({
  page,
}) => {
  await login(page, "organizer");
  await page.goto(`/organizer/tournaments/${ids.tournament}/edit`);
  await expect(page.getByLabel("Tournament name", { exact: true })).toHaveValue(
    "Varanasi Grassroots Cup",
  );
  await page.getByLabel("Tournament name", { exact: true }).fill("Updated Campus Cup");
  await page.getByLabel("Tournament status", { exact: true }).selectOption("IN_PROGRESS");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Team size", { exact: true }).fill("3");
  await page.getByLabel("Customize free-agent role quotas", { exact: true }).check();
  for (const role of ["BATSMAN", "BOWLER", "WICKETKEEPER"])
    await page.getByLabel(`${role} slots`, { exact: true }).fill("1");
  await page.getByLabel("Allocate per-place prizes", { exact: true }).check();
  await page.getByLabel("First place prize (INR)", { exact: true }).fill("10000");
  await page.getByLabel("Second place prize (INR)", { exact: true }).fill("5000");
  await page.getByLabel("Third place prize (INR)", { exact: true }).fill("2000");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().endsWith(`/api/backend/tournaments/${ids.tournament}`),
  );
  await page.getByRole("button", { name: "Save tournament changes", exact: true }).click();
  const result = await saved;
  expect(result.status()).toBe(200);
  expect(result.request().postDataJSON()).toMatchObject({
    name: "Updated Campus Cup",
    status: "IN_PROGRESS",
    teamSize: 3,
    rulesConfig: {
      roleQuotas: { BATSMAN: 1, BOWLER: 1, WICKETKEEPER: 1, ALL_ROUNDER: 0 },
      prizeBreakdown: { first: 10000, second: 5000, third: 2000 },
    },
  });
  await page.goto(`/organizer/tournaments/${ids.tournament}/edit`);
  await expect(page.getByLabel("Tournament name", { exact: true })).toHaveValue(
    "Updated Campus Cup",
  );
});

test("saved brackets support quota/prize updates and explicit deletion", async ({ page }) => {
  await login(page, "organizer");
  await page.goto(`/organizer/tournaments/${ids.tournament}/brackets`);
  await page.getByText("Manage bracket configuration", { exact: true }).click();
  const editor = page.getByRole("form", { name: "Community tier", exact: true });
  await editor.getByLabel("Maximum GTI", { exact: true }).fill("65");
  await editor.getByLabel("Customize free-agent role quotas", { exact: true }).check();
  await editor.getByLabel("BOWLER slots", { exact: true }).fill("11");
  await editor.getByLabel("Allocate per-place prizes", { exact: true }).check();
  await editor.getByLabel("First place prize (INR)", { exact: true }).fill("1000");
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().endsWith(`/api/backend/tournaments/${ids.tournament}/brackets/${ids.bracket}`),
  );
  await editor.getByRole("button", { name: "Save bracket changes", exact: true }).click();
  const result = await saved;
  expect(result.status()).toBe(200);
  expect(result.request().postDataJSON()).toMatchObject({
    maxGti: 65,
    config: { roleQuotas: { BOWLER: 11 }, prizeBreakdown: { first: 1000, second: 0, third: 0 } },
  });
  await expect(page.getByRole("status").filter({ hasText: "Bracket saved" })).toBeVisible();
  page.once("dialog", (dialog) => {
    void dialog.accept();
  });
  const deleted = page.waitForResponse(
    (response) =>
      response.request().method() === "DELETE" &&
      response.url().endsWith(`/api/backend/tournaments/${ids.tournament}/brackets/${ids.bracket}`),
  );
  await editor.getByRole("button", { name: "Delete bracket", exact: true }).click();
  expect((await deleted).status()).toBe(200);
  await expect(editor).toHaveCount(0);
});

test("organizer reads rosters and fair-play logs and triggers a real queue refresh", async ({
  page,
}) => {
  await login(page, "organizer");
  await page.goto(`/organizer/tournaments/${ids.tournament}/rosters`);
  await expect(page.getByRole("tabpanel")).toContainText("athlete@example.com");
  await expect(page.getByRole("tabpanel")).toContainText("VERIFIED");
  await page
    .getByRole("tab", { name: "Anti-Sandbagging Fair-Play Block Log", exact: true })
    .click();
  await expect(page.getByRole("tabpanel")).toContainText("SANDBAGGING_DETECTED");
  await expect(page.getByRole("tabpanel")).toContainText("72.5");
  await page.getByRole("tab", { name: "Free-Agent Pool Queue Monitor", exact: true }).click();
  await expect(page.getByRole("tabpanel")).toContainText("queue-01@example.com");
  const processed = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().endsWith(`/brackets/${ids.bracket}/free-agents/process`),
  );
  await page.getByRole("button", { name: "Trigger Matchmaker", exact: true }).click();
  expect((await processed).status()).toBe(200);
  await expect(page.getByRole("status").filter({ hasText: "Eligible teams formed" })).toBeVisible();
  await expect(page.getByRole("tabpanel")).toContainText("No queued free agents");
  await page
    .getByRole("tab", { name: "Verified Roster & Registrations Inspector", exact: true })
    .click();
  await expect(page.getByRole("tabpanel")).toContainText("FA-Roster-TEST");
  await expect(page.getByRole("tabpanel")).toContainText("queue-11@example.com");
});

test("organizer records named match outcomes and the athlete receives the updated match component", async ({
  page,
  request,
}) => {
  await request.post("http://localhost:4100/__control__/event-in-progress");
  await login(page, "organizer");
  await page.goto(`/organizer/brackets?tournamentId=${ids.tournament}`);
  await page
    .getByRole("tab", { name: "Match Result & Score Verification Form", exact: true })
    .click();
  await page.getByLabel("Match name", { exact: true }).fill("Campus semi-final");
  await page.getByLabel("Score summary", { exact: true }).fill("2-1");
  await page.getByLabel("Result for athlete@example.com", { exact: true }).selectOption("winner");
  await page.getByLabel("Result for opponent@example.com", { exact: true }).selectOption("loser");
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().endsWith(`/brackets/${ids.bracket}/matches/results`),
  );
  await page.getByRole("button", { name: "Record verified result", exact: true }).click();
  const response = await saved;
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON()).toMatchObject({
    matchName: "Campus semi-final",
    winnerAthleteIds: [ids.athlete],
    loserAthleteIds: ["10000000-0000-4000-8000-000000000005"],
    scoreSummary: { summary: "2-1" },
  });
  await expect(page.getByRole("status").filter({ hasText: "Result verified" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await login(page);
  await page.goto("/athlete/passport");
  await expect(
    page.getByRole("group", { name: "Verified Match Performance", exact: true }),
  ).toContainText("51.0");
});

test("the confidential safety wall persists a critical incident, medical acknowledgement and match resume", async ({
  page,
  request,
}) => {
  await login(page, "organizer");
  await page.goto(`/organizer/tournaments/${ids.tournament}/safety`);
  await expect(page.getByText("Live connection", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Vitals for athlete@example.com", exact: true }),
  ).toContainText("NORMAL");
  await request.post("http://localhost:4100/__control__/critical-safety");
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.reload();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("205 bpm");
  await expect(dialog).toContainText("PAUSED_SAFETY");
  expect(
    await dialog.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
        screenWidth: innerWidth,
        screenHeight: innerHeight,
      };
    }),
  ).toEqual({ left: 0, top: 0, width: 1280, height: 720, screenWidth: 1280, screenHeight: 720 });
  await dialog
    .getByLabel("Medical check / clearance note", { exact: true })
    .fill("Medical staff dispatched and checked the athlete");
  const acknowledged = page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().endsWith(`/safety/alerts/${ids.alert}/acknowledge`),
  );
  await dialog
    .getByRole("button", {
      name: "Acknowledge & Confirm Match Paused / Medical Check Dispatched",
      exact: true,
    })
    .click();
  expect((await acknowledged).status()).toBe(200);
  await expect(
    dialog.getByText("Medical check recorded on the server.", { exact: true }),
  ).toBeVisible();
  await request.post("http://localhost:4100/__control__/normal-safety");
  await dialog
    .getByLabel("Medical clearance has been confirmed by field staff", { exact: true })
    .check();
  const resumed = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/safety/matches/") &&
      response.url().endsWith("/resume"),
  );
  await dialog.getByRole("button", { name: "Clear Athlete & Resume Match", exact: true }).click();
  expect((await resumed).status()).toBe(200);
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("table").filter({ hasText: "BLE" })).toContainText(
    "Medical staff dispatched and checked the athlete",
  );
  await page.reload();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Vitals for athlete@example.com", exact: true }),
  ).toContainText("NORMAL");
});

test("tournament deletion removes the owned directory entry after confirmation", async ({
  page,
}) => {
  await login(page, "organizer");
  await page.goto("/organizer/tournaments");
  page.once("dialog", (dialog) => {
    void dialog.accept();
  });
  const removed = page.waitForResponse(
    (response) =>
      response.request().method() === "DELETE" &&
      response.url().endsWith(`/api/backend/tournaments/${ids.tournament}`),
  );
  await page.getByRole("button", { name: "Delete tournament", exact: true }).click();
  expect((await removed).status()).toBe(200);
  await expect(
    page.getByText("No tournaments yet. Create your first event.", { exact: true }),
  ).toBeVisible();
});

test("scoped leaderboards traverse ties and open a dossier from a ranking row", async ({
  page,
}) => {
  await login(page, "scout");
  await page.goto("/scout/leaderboards");
  const table = page.getByRole("table", { name: "Scoped GTI leaderboard" });
  await expect(table.getByRole("row")).toHaveCount(21);
  for (const rank of [1, 2, 3])
    await expect(page.getByRole("region", { name: `Podium rank ${rank}` })).toContainText(
      "GTI 95.0",
    );
  const next = page.waitForResponse(
    (response) =>
      response.url().includes("gti/leaderboards?") &&
      new URL(response.url()).searchParams.has("cursor_id"),
  );
  await page.getByRole("button", { name: "Load more", exact: true }).click();
  expect((await next).status()).toBe(200);
  await expect(table.getByRole("row")).toHaveCount(26);
  await expect(table.getByText("Prospect 25", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Load more", exact: true })).toHaveCount(0);
  await table.getByRole("row").filter({ hasText: "Prospect 02" }).getByRole("cell").nth(2).click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Verified HMAC Drill Evidence" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "STATE", exact: true }).click();
  await page.getByLabel("Leaderboard state", { exact: true }).fill("Uttar Pradesh");
  await page.getByLabel("Listing sport", { exact: true }).selectOption("CRICKET");
  await page.getByLabel("Demographic", { exact: true }).selectOption("RURAL");
  await expect(table).toContainText("Prospect 03");
  await expect(table.getByText("Prospect 01", { exact: true })).toHaveCount(0);
  await expect(table.getByRole("row").filter({ hasText: "FOOTBALL" })).toHaveCount(0);
  await page.getByLabel("Demographic", { exact: true }).selectOption("FEMALE");
  await expect(table).toContainText("Prospect 01");
  await page.getByRole("button", { name: "DISTRICT", exact: true }).click();
  await page.getByLabel("Leaderboard state", { exact: true }).fill("Karnataka");
  await page.getByLabel("Leaderboard district", { exact: true }).fill("Varanasi");
  await expect(table.getByRole("row")).toHaveCount(2);
  await expect(table).toContainText("Prospect 25");
  await expect(table).toContainText("Karnataka");
  await page.setViewportSize({ width: 360, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("dossier outreach retries preserve the operation and persist trial, sponsorship and shortlist history", async ({
  page,
}) => {
  await login(page, "scout");
  await page.goto(`/scout/athletes/${ids.athlete}`);
  await expect(
    page.getByRole("heading", { name: "Season-over-Season GTI Progression", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("abcdef012345", { exact: true })).toBeVisible();
  await expect(page.getByText("126.5 bpm", { exact: true })).toBeVisible();
  await page.getByLabel("Organization name (optional)", { exact: true }).fill("Campus Academy");
  await page
    .getByLabel("Outreach notes (optional)", { exact: true })
    .fill("Invite for a supervised assessment");
  let interrupted = false;
  const operationKeys: string[] = [];
  await page.route(`**/api/backend/scouts/dossiers/${ids.athlete}/outreach`, async (route) => {
    operationKeys.push(route.request().headers()["idempotency-key"]!);
    if (!interrupted) {
      interrupted = true;
      await route.fetch();
      await route.fulfill({
        status: 503,
        contentType: "application/problem+json",
        body: JSON.stringify({
          type: "about:blank",
          title: "Service Unavailable",
          status: 503,
          detail: "Response interrupted after persistence",
          instance: "",
          timestamp: new Date().toISOString(),
        }),
      });
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Offer Academy Trial", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Response interrupted after persistence" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Offer Academy Trial", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Outreach saved" })).toBeVisible();
  expect(operationKeys).toHaveLength(2);
  expect(operationKeys[0]).toBe(operationKeys[1]);
  await expect(page.getByText(/OFFER_TRIAL ·/)).toHaveCount(1);
  await page
    .getByRole("button", { name: "Issue Scholarship / Sponsorship Inquiry", exact: true })
    .click();
  await expect(page.getByText(/SPONSORSHIP_INQUIRY ·/)).toHaveCount(1);
  await page.getByRole("button", { name: "Bookmark to Shortlist", exact: true }).click();
  await expect(page.getByText(/SHORTLIST_BOOKMARK ·/)).toHaveCount(1);
  await expect(page.getByText(/Bookmarked to your shortlist/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Bookmarked to your shortlist/)).toBeVisible();
  for (const action of ["OFFER_TRIAL", "SPONSORSHIP_INQUIRY", "SHORTLIST_BOOKMARK"])
    await expect(page.getByText(new RegExp(`${action} ·`))).toHaveCount(1);
});

test("an athlete opting out prevents dossier reads and hides outreach controls", async ({
  page,
  request,
}) => {
  await login(page, "scout");
  await request.post("http://localhost:4100/__control__/scout-opt-out");
  await page.goto(`/scout/athletes/${ids.athlete}`);
  await expect(
    page.getByRole("alert").filter({ hasText: "not opted into scout discovery" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Verified HMAC Drill Evidence" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Offer Academy Trial" })).toHaveCount(0);
});

test("admin verification queues approve and revoke organizer and scout credentials with durable audit records", async ({
  page,
}) => {
  await login(page, "admin");
  await page.goto("/admin/organizers");
  const organizer = "pending-organizer-0@example.com";
  const account = () => page.getByRole("group", { name: `Account ${organizer}`, exact: true });
  await expect(account()).toContainText("UNVERIFIED");
  const saved = page.waitForResponse(
    (response) => response.request().method() === "PATCH" && response.url().endsWith("/governance"),
  );
  await account().getByRole("button", { name: "Approve credentials", exact: true }).click();
  expect((await saved).status()).toBe(200);
  await expect(account()).toHaveCount(0);
  await page.getByLabel("Verification status", { exact: true }).selectOption("VERIFIED");
  await expect(account()).toContainText("VERIFIED");
  await expect(account()).toContainText("Active");
  page.once("dialog", (dialog) => {
    void dialog.accept();
  });
  await account().getByRole("button", { name: "Revoke credentials", exact: true }).click();
  await expect(account()).toHaveCount(0);
  await page.getByLabel("Verification status", { exact: true }).selectOption("REVOKED");
  await expect(account()).toContainText("Inactive");
  await page.getByLabel("Directory role", { exact: true }).selectOption("SCOUT");
  await page.getByLabel("Verification status", { exact: true }).selectOption("UNVERIFIED");
  const scout = page.getByRole("group", {
    name: "Account pending-scout-1@example.com",
    exact: true,
  });
  await scout.getByRole("button", { name: "Approve credentials", exact: true }).click();
  await expect(scout).toHaveCount(0);
  await page.goto("/admin/audit-logs");
  await page.getByRole("button", { name: "Governance", exact: true }).click();
  await expect(page.getByRole("table")).toContainText("Account credentials or access changed");
  await page
    .getByRole("table")
    .getByRole("button", { name: /^View metadata for / })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText('"verificationStatus": "VERIFIED"');
});

test("admin user directory paginates every account and preserves inactive filters", async ({
  page,
}) => {
  await login(page, "admin");
  await page.goto("/admin/users");
  const accounts = page.getByRole("group", { name: /^Account / });
  await expect(accounts).toHaveCount(20);
  await page.getByRole("button", { name: "Load more", exact: true }).click();
  await expect(accounts).toHaveCount(28);
  await expect(page.getByRole("button", { name: "Load more", exact: true })).toHaveCount(0);
  const filtered = page.waitForRequest(
    (request) =>
      request.url().includes("/admin/users?") &&
      new URL(request.url()).searchParams.get("isActive") === "false",
  );
  await page.getByLabel("Account state", { exact: true }).selectOption("false");
  await filtered;
  await expect(accounts).toHaveCount(8);
  await page.getByLabel("Directory role", { exact: true }).selectOption("SCOUT");
  await expect(accounts).toHaveCount(4);
  await expect(accounts.first()).toContainText("Inactive");
});

test("global tournament moderation persists featured placement, suspension and final status", async ({
  page,
}) => {
  await login(page, "admin");
  await page.goto("/admin/tournaments");
  const table = page.getByRole("table", { name: "Platform-wide tournament moderation" });
  await table.getByRole("button", { name: "Feature tournament", exact: true }).click();
  await expect(table).toContainText("Featured");
  page.once("dialog", (dialog) => {
    void dialog.accept();
  });
  await table.getByRole("button", { name: "Suspend tournament", exact: true }).click();
  await expect(table.getByRole("combobox")).toHaveValue("SUSPENDED");
  await page
    .getByLabel("Set status for Varanasi Grassroots Cup", { exact: true })
    .selectOption("IN_PROGRESS");
  await expect(table.getByRole("combobox")).toHaveValue("IN_PROGRESS");
  await page
    .getByLabel("Set status for Varanasi Grassroots Cup", { exact: true })
    .selectOption("COMPLETED");
  await expect(table.getByRole("combobox")).toHaveValue("COMPLETED");
  await expect(table).toContainText("Standard listing");
  await page.getByLabel("Tournament status filter", { exact: true }).selectOption("COMPLETED");
  await expect(table).toContainText("Varanasi Grassroots Cup");
  await page.goto("/admin/audit-logs");
  await page.getByRole("button", { name: "Governance", exact: true }).click();
  await page
    .getByLabel("Governance category", { exact: true })
    .selectOption("TOURNAMENT_MODERATION");
  await page
    .getByRole("table")
    .getByRole("button", { name: /^View metadata for / })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText('"status": "COMPLETED"');
});

test("system monitoring distinguishes failed probes from measured latencies", async ({
  page,
  request,
}) => {
  await login(page, "admin");
  await page.goto("/admin/system");
  await expect(page.getByText("1.25 ms · ok", { exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toContainText("gti-calculation");
  await request.post("http://localhost:4100/__control__/degraded-health");
  await page.getByRole("button", { name: "Refresh subsystem health", exact: true }).click();
  await expect(page.getByText("degraded", { exact: true })).toBeVisible();
  await expect(page.getByText("Probe failed · unavailable", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("table").getByRole("cell", { name: "unreachable", exact: true }),
  ).toHaveCount(3);
  await expect(page.getByText("Unavailable", { exact: true })).toHaveCount(0);
});
