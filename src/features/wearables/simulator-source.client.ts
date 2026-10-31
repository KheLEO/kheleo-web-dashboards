"use client";
import type { BiometricReading, BiometricSource, SimulatorScenario } from "./types";
export function simulatedReading(
  scenario: SimulatorScenario,
  tick: number,
  timestamp = Date.now(),
): BiometricReading {
  const bases = {
    normal: { heartRate: 110, spo2: 98, skinTemperature: 36.6 },
    warning: { heartRate: 188, spo2: 92, skinTemperature: 38.7 },
    critical: { heartRate: 202, spo2: 88, skinTemperature: 39.8 },
    "heat-exhaustion": { heartRate: 170, spo2: 95, skinTemperature: 40.2 },
    "cardiac-strain": { heartRate: 204, spo2: 88, skinTemperature: 37.0 },
  };
  const base = bases[scenario];
  return {
    heartRate: base.heartRate + (tick % 3),
    spo2: base.spo2,
    skinTemperature: Number((base.skinTemperature + (tick % 2) * 0.1).toFixed(1)),
    timestamp,
    source: "simulator",
  };
}
export class SimulatorSource implements BiometricSource {
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(private readonly scenario: SimulatorScenario) {}
  async start(
    onReading: (reading: BiometricReading) => void,
    _onError: (error: Error) => void,
  ): Promise<void> {
    this.stop();
    let tick = 0;
    onReading(simulatedReading(this.scenario, tick++));
    this.timer = setInterval(() => onReading(simulatedReading(this.scenario, tick++)), 1000);
  }
  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
