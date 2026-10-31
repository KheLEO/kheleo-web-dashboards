import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ids } from "../../src/test/factories";
async function login(page: Page, role = "athlete"): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(`${role}@example.com`);
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
  await page.getByRole("button", { name: "Confirm registration" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "SANDBAGGING_DETECTED" })).toBeVisible();
  await expect(page.getByRole("link", { name: "View suggested GOLD bracket" })).toHaveAttribute(
    "href",
    `/athlete/tournaments/${ids.tournament}/brackets/${ids.higher}`,
  );
});
test("free-agent roster arrives over the real Socket.IO client", async ({ page, request }) => {
  await login(page);
  await page.goto(`/athlete/tournaments/${ids.tournament}/brackets/${ids.bracket}/pool`);
  await page.getByLabel("Primary role", { exact: true }).fill("BOWLER");
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
  await page.getByLabel("Venue name").fill("Sigra Stadium");
  await page.getByLabel("Venue latitude").fill("25.3176");
  await page.getByLabel("Venue longitude").fill("82.9739");
  await page.getByLabel("Registration deadline").fill("2027-01-01T12:00");
  await page.getByLabel("Start date").fill("2027-01-05T12:00");
  await page.getByLabel("End date").fill("2027-01-10T12:00");
  await page.getByRole("button", { name: "Create tournament", exact: true }).click();
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
    document.documentElement.style.setProperty("--kheleo-gold-primary", "100 200 150"),
  );
  const color = await page
    .locator(".eyebrow")
    .first()
    .evaluate((element) => getComputedStyle(element).color);
  expect(color).toBe("rgb(100, 200, 150)");
});
