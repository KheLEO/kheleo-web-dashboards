"use client";
import type { BiometricSource, BiometricReading } from "./types";
import { parseHeartRate } from "./heart-rate-parser";
export class BluetoothSource implements BiometricSource {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private onReading: ((reading: BiometricReading) => void) | null = null;
  private onError: ((error: Error) => void) | null = null;
  private stopped = false;
  private readonly measurement = (): void => {
    try {
      const value = this.characteristic?.value;
      if (!value) throw new Error("No heart-rate measurement was provided.");
      this.onReading?.({
        heartRate: parseHeartRate(value),
        spo2: null,
        skinTemperature: null,
        timestamp: Date.now(),
        source: "bluetooth",
      });
    } catch (error: unknown) {
      this.onError?.(
        error instanceof Error ? error : new Error("Unable to read wearable measurement."),
      );
    }
  };
  private readonly disconnected = (): void => {
    if (!this.stopped)
      this.onError?.(new Error("Wearable disconnected. Reconnect to resume readings."));
    this.stop();
  };
  async start(
    onReading: (reading: BiometricReading) => void,
    onError: (error: Error) => void,
  ): Promise<void> {
    this.onReading = onReading;
    this.onError = onError;
    if (
      typeof window === "undefined" ||
      typeof navigator === "undefined" ||
      !window.isSecureContext ||
      !navigator.bluetooth
    )
      throw new Error("Web Bluetooth requires a supported browser and HTTPS (or localhost).");
    const device = await navigator.bluetooth.requestDevice({ filters: [{ services: [0x180d] }] });
    if (this.stopped) return;
    this.device = device;
    device.addEventListener("gattserverdisconnected", this.disconnected);
    if (!device.gatt) throw new Error("The selected device does not expose a GATT server.");
    const server = await device.gatt.connect();
    if (this.stopped) {
      server.disconnect();
      return;
    }
    const service = await server.getPrimaryService(0x180d);
    const characteristic = await service.getCharacteristic(0x2a37);
    if (this.stopped) {
      server.disconnect();
      return;
    }
    this.characteristic = characteristic;
    characteristic.addEventListener("characteristicvaluechanged", this.measurement);
    await characteristic.startNotifications();
  }
  stop(): void {
    this.stopped = true;
    this.characteristic?.removeEventListener("characteristicvaluechanged", this.measurement);
    this.device?.removeEventListener("gattserverdisconnected", this.disconnected);
    if (this.device?.gatt?.connected) this.device.gatt.disconnect();
    this.characteristic = null;
    this.device = null;
    this.onReading = null;
    this.onError = null;
  }
}
