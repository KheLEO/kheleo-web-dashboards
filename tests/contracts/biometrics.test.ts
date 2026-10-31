import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyVitals } from "@/contracts/safety";
import { parseHeartRate } from "@/features/wearables/heart-rate-parser";
import { SimulatorSource, simulatedReading } from "@/features/wearables/simulator-source.client";
import { TelemetryDispatcher } from "@/features/wearables/telemetry-dispatcher";
import { ids } from "@/test/factories";
describe("backend-aligned biometric thresholds", () => {
  it.each([
    [195, 98, 36.6, "WARNING"],
    [196, 98, 36.6, "CRITICAL"],
    [110, 90, 36.6, "WARNING"],
    [110, 89, 36.6, "CRITICAL"],
    [110, 98, 39.5, "WARNING"],
    [110, 98, 39.6, "CRITICAL"],
    [185, 98, 36.6, "NORMAL"],
    [186, 98, 36.6, "WARNING"],
    [110, 93, 36.6, "NORMAL"],
    [110, 92, 36.6, "WARNING"],
    [110, 98, 38.5, "NORMAL"],
    [110, 98, 38.6, "WARNING"],
  ])(
    "classifies HR %s / SpO2 %s / temp %s as %s",
    (heart_rate, spo2, skin_temperature, expected) => {
      expect(
        classifyVitals({
          heart_rate: Number(heart_rate),
          spo2: Number(spo2),
          skin_temperature: Number(skin_temperature),
        }),
      ).toBe(expected);
    },
  );
  it("parses both little-endian HR formats and rejects short packets", () => {
    expect(parseHeartRate(new DataView(Uint8Array.from([0, 72]).buffer))).toBe(72);
    expect(parseHeartRate(new DataView(Uint8Array.from([1, 200, 0]).buffer))).toBe(200);
    expect(() => parseHeartRate(new DataView(Uint8Array.from([1, 200]).buffer))).toThrow(
      "incomplete",
    );
  });
});
describe("biometric lifecycle and dispatch", () => {
  afterEach(() => vi.useRealTimers());
  it("stops simulator timers and emits deterministic data", async () => {
    vi.useFakeTimers();
    const source = new SimulatorSource("critical");
    const listener = vi.fn();
    await source.start(listener, vi.fn());
    await vi.advanceTimersByTimeAsync(2000);
    expect(listener).toHaveBeenCalledTimes(3);
    source.stop();
    await vi.advanceTimersByTimeAsync(2000);
    expect(listener).toHaveBeenCalledTimes(3);
    expect(simulatedReading("normal", 0, 10)).toMatchObject({
      heartRate: 110,
      timestamp: 10,
      source: "simulator",
    });
  });
  it("keeps critical pending readings ahead of normal data while one request is in flight", async () => {
    vi.useFakeTimers();
    let release: (() => void) | undefined;
    const send = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            release = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    const dispatcher = new TelemetryDispatcher(send, vi.fn());
    const base = {
      athlete_id: ids.athlete,
      heart_rate: 110,
      spo2: 98,
      skin_temperature: 36.6,
      timestamp: Date.now(),
    };
    dispatcher.push(base);
    await vi.advanceTimersByTimeAsync(0);
    dispatcher.push({ ...base, heart_rate: 202 });
    dispatcher.push({ ...base, heart_rate: 111 });
    expect(send).toHaveBeenCalledTimes(1);
    release?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(send.mock.calls[1]?.[0].body)) as unknown).toMatchObject({
      heart_rate: 202,
    });
    dispatcher.stop();
  });
  it("retries a failed sample with the identical operation ID and payload", async () => {
    vi.useFakeTimers();
    const send = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    const error = vi.fn();
    const dispatcher = new TelemetryDispatcher(send, error);
    dispatcher.push({
      athlete_id: ids.athlete,
      heart_rate: 202,
      spo2: 88,
      skin_temperature: 40,
      timestamp: Date.now(),
    });
    await vi.advanceTimersByTimeAsync(0);
    dispatcher.retry();
    await vi.advanceTimersByTimeAsync(0);
    expect(send.mock.calls[0]?.[0]).toBe(send.mock.calls[1]?.[0]);
    expect(error).toHaveBeenCalledTimes(1);
    dispatcher.stop();
  });
});
