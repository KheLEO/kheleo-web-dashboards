export interface BiometricReading {
  heartRate: number;
  spo2: number | null;
  skinTemperature: number | null;
  timestamp: number;
  source: "bluetooth" | "simulator";
  baselineFields?: ("spo2" | "skin_temperature")[];
}
export interface BiometricSource {
  start(
    onReading: (reading: BiometricReading) => void,
    onError: (error: Error) => void,
  ): Promise<void>;
  stop(): void;
}
export type SimulatorScenario =
  "normal" | "warning" | "critical" | "heat-exhaustion" | "cardiac-strain";
