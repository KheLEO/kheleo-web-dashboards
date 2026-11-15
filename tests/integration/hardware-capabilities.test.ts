import { expect, it, vi } from "vitest";
import { sessionCapabilities } from "@/server/capabilities";

vi.mock("@/server/env", () => ({
  getEnvironment: () => ({
    TELEMETRY_SERVICE_HMAC_SECRET: "fixture-only-telemetry-key",
    SIMULATOR_INGESTION: "false",
  }),
}));

it("allows real hardware ingestion independently of disabled simulator ingestion", () => {
  const capabilities = sessionCapabilities();
  expect(capabilities.simulatorIngestion).toBe(false);
  expect(capabilities.hardwareTelemetryIngestion).toBe(true);
});
