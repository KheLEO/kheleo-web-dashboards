import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: "http://localhost:3001", trace: "retain-on-failure" },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
        },
      },
    },
  ],
  webServer: [
    {
      command: "pnpm exec tsx tests/fixtures/backend.ts",
      url: "http://localhost:4100/ready",
      reuseExistingServer: false,
    },
    {
      command: "pnpm dev",
      url: "http://localhost:3001",
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        APP_ORIGIN: "http://localhost:3001",
        NEST_API_URL: "http://localhost:4100/api/v1",
        SESSION_STORE: "memory",
        APP_ENV: "test",
        NEXT_PUBLIC_SOCKET_ORIGIN: "http://localhost:4100",
      },
    },
  ],
});
