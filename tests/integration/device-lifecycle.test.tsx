import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BiometricReading, BiometricSource } from "@/features/wearables/types";
import { useWearable } from "@/features/wearables/use-wearable";

const pose = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/features/drills/pose-engine.client", () => ({ createPoseEngine: pose.create }));
import { useDrillSession } from "@/features/drills/use-drill-session";

afterEach(() => {
  vi.clearAllMocks();
});

function cameraStream(): { stream: MediaStream; stop: ReturnType<typeof vi.fn> } {
  const stop = vi.fn();
  return { stream: { getTracks: () => [{ stop }] } as unknown as MediaStream, stop };
}

describe("camera permission lifecycle", () => {
  it("stops a stream granted after Stop without initializing the pose worker", () => {
    const hook = renderHook(() => useDrillSession());
    act(() => hook.result.current.start());
    const lateStream = hook.result.current.onStream;
    act(() => hook.result.current.stop());
    const camera = cameraStream();
    act(() => lateStream(camera.stream));
    expect(camera.stop).toHaveBeenCalledOnce();
    expect(pose.create).not.toHaveBeenCalled();
    expect(hook.result.current.cameraEnabled).toBe(false);
    hook.unmount();
  });

  it("ignores stale camera callbacks after a new request or unmount", () => {
    const hook = renderHook(() => useDrillSession());
    act(() => hook.result.current.start());
    const stale = {
      stream: hook.result.current.onStream,
      error: hook.result.current.onCameraError,
    };
    act(() => hook.result.current.stop());
    act(() => hook.result.current.start());
    const camera = cameraStream();
    act(() => {
      stale.stream(camera.stream);
      stale.error("The cancelled request was denied.");
    });
    expect(camera.stop).toHaveBeenCalledOnce();
    expect(pose.create).not.toHaveBeenCalled();
    expect(hook.result.current.cameraEnabled).toBe(true);
    expect(hook.result.current.state.error).toBeNull();
    const afterUnmount = hook.result.current.onStream;
    hook.unmount();
    const late = cameraStream();
    afterUnmount(late.stream);
    expect(late.stop).toHaveBeenCalledOnce();
    expect(pose.create).not.toHaveBeenCalled();
  });
});

describe("wearable connection lifecycle", () => {
  it("allows a new source after a pending connection is stopped and ignores the old result", async () => {
    let resolveConnection: (() => void) | undefined;
    let oldReading: ((reading: BiometricReading) => void) | undefined;
    const pending: BiometricSource = {
      start: (onReading) => {
        oldReading = onReading;
        return new Promise<void>((resolve) => {
          resolveConnection = resolve;
        });
      },
      stop: vi.fn(),
    };
    const sample: BiometricReading = {
      heartRate: 111,
      spo2: 98,
      skinTemperature: 36.6,
      timestamp: 1,
      source: "simulator",
    };
    const next: BiometricSource = {
      start: vi.fn(async (onReading: (reading: BiometricReading) => void) => {
        onReading(sample);
      }),
      stop: vi.fn(),
    };
    const hook = renderHook(() => useWearable());
    let connection: Promise<void> | undefined;
    act(() => {
      connection = hook.result.current.connect(pending);
    });
    act(() => hook.result.current.stop());
    await act(async () => {
      await hook.result.current.connect(next);
    });
    expect(next.start).toHaveBeenCalledOnce();
    expect(hook.result.current.latest).toEqual(sample);
    await act(async () => {
      oldReading?.({ ...sample, heartRate: 202 });
      resolveConnection?.();
      await connection;
    });
    expect(hook.result.current.latest).toEqual(sample);
    expect(hook.result.current.status).toBe("connected");
    hook.unmount();
    expect(next.stop).toHaveBeenCalledOnce();
  });
});
