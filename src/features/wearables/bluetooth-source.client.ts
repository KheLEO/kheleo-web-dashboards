"use client";
import type { BiometricSource, BiometricReading } from "./types";
import { parseOxygenSaturation, parseTemperature } from "./physiology-parsers";
import { parseHeartRate } from "./heart-rate-parser";
export class BluetoothSource implements BiometricSource {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private onReading: ((reading: BiometricReading) => void) | null = null;
  private onError: ((error: Error) => void) | null = null;
  private stopped = false;
  private spo2 = 98;
  private temperature = 36.8;
  private baselineFields = new Set<"spo2" | "skin_temperature">(["spo2", "skin_temperature"]);
  private optionalCharacteristics: {
    characteristic: BluetoothRemoteGATTCharacteristic;
    listener: () => void;
  }[] = [];
  private async optionalSensor(
    server: BluetoothRemoteGATTServer,
    serviceId: number,
    characteristicId: number,
    field: "spo2" | "skin_temperature",
  ): Promise<void> {
    try {
      const service = await server.getPrimaryService(serviceId);
      const characteristic = await service.getCharacteristic(characteristicId);
      if (this.stopped) return;
      const listener = (): void => {
        try {
          if (!characteristic.value) throw new Error("No sensor measurement was provided.");
          if (field === "spo2") this.spo2 = parseOxygenSaturation(characteristic.value);
          else this.temperature = parseTemperature(characteristic.value);
          this.baselineFields.delete(field);
        } catch (error: unknown) {
          this.onError?.(error instanceof Error ? error : new Error("Invalid sensor packet."));
        }
      };
      characteristic.addEventListener("characteristicvaluechanged", listener);
      this.optionalCharacteristics.push({ characteristic, listener });
      await characteristic.startNotifications();
    } catch (error: unknown) {
      if (!(
        error instanceof DOMException && ["NotFoundError", "NotSupportedError"].includes(error.name)
      ))
        throw error;
    }
  }
  private readonly measurement = (): void => {
    try {
      const value = this.characteristic?.value;
      if (!value) throw new Error("No heart-rate measurement was provided.");
      this.onReading?.({
        heartRate: parseHeartRate(value),
        spo2: this.spo2,
        skinTemperature: this.temperature,
        baselineFields: [...this.baselineFields],
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
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [0x180d] }],
      optionalServices: [0x1822, 0x1809],
    });
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
    await this.optionalSensor(server, 0x1822, 0x2a5f, "spo2");
    await this.optionalSensor(server, 0x1809, 0x2a1c, "skin_temperature");
    if (this.stopped) return;
    this.characteristic = characteristic;
    characteristic.addEventListener("characteristicvaluechanged", this.measurement);
    await characteristic.startNotifications();
  }
  stop(): void {
    this.stopped = true;
    for (const { characteristic, listener } of this.optionalCharacteristics)
      characteristic.removeEventListener("characteristicvaluechanged", listener);
    this.optionalCharacteristics = [];
    this.characteristic?.removeEventListener("characteristicvaluechanged", this.measurement);
    this.device?.removeEventListener("gattserverdisconnected", this.disconnected);
    if (this.device?.gatt?.connected) this.device.gatt.disconnect();
    this.characteristic = null;
    this.device = null;
    this.onReading = null;
    this.onError = null;
  }
}
