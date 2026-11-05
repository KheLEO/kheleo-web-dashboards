import { afterEach, expect, it, vi } from "vitest";
import { BluetoothSource } from "@/features/wearables/bluetooth-source.client";
class Characteristic extends EventTarget {
  value: DataView | undefined;
  startNotifications = vi.fn(async () => this);
  emit(bytes: number[]): void {
    this.value = new DataView(Uint8Array.from(bytes).buffer);
    this.dispatchEvent(new Event("characteristicvaluechanged"));
  }
}
afterEach(() => vi.unstubAllGlobals());
function setup(optional: boolean) {
  const heart = new Characteristic(),
    oxygen = new Characteristic(),
    temperature = new Characteristic();
  const characteristics = new Map([
    [0x180d, heart],
    [0x1822, oxygen],
    [0x1809, temperature],
  ]);
  const disconnect = vi.fn();
  const server = {
    connected: true,
    disconnect,
    getPrimaryService: vi.fn(async (id: number) => {
      if (!optional && id !== 0x180d) throw new DOMException("Service absent", "NotFoundError");
      return { getCharacteristic: async () => characteristics.get(id) };
    }),
  };
  const device = Object.assign(new EventTarget(), {
    gatt: { ...server, connect: async () => server },
  });
  const requestDevice = vi.fn(async () => device);
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("navigator", { bluetooth: { requestDevice } });
  return { heart, oxygen, temperature, requestDevice, disconnect };
}
it("requests optional services and clearly labels heart-rate-only baseline defaults", async () => {
  const fixture = setup(false);
  const source = new BluetoothSource(),
    reading = vi.fn(),
    failure = vi.fn();
  await source.start(reading, failure);
  expect(fixture.requestDevice).toHaveBeenCalledWith({
    filters: [{ services: [0x180d] }],
    optionalServices: [0x1822, 0x1809],
  });
  fixture.heart.emit([0, 100]);
  expect(reading).toHaveBeenLastCalledWith(
    expect.objectContaining({
      heartRate: 100,
      spo2: 98,
      skinTemperature: 36.8,
      source: "bluetooth",
      baselineFields: ["spo2", "skin_temperature"],
    }),
  );
  expect(failure).not.toHaveBeenCalled();
  source.stop();
  fixture.heart.emit([0, 200]);
  expect(reading).toHaveBeenCalledOnce();
  expect(fixture.disconnect).toHaveBeenCalledOnce();
});
it("uses measured optional vitals, removes baseline labels, and releases notifications", async () => {
  const fixture = setup(true);
  const source = new BluetoothSource(),
    reading = vi.fn(),
    failure = vi.fn();
  await source.start(reading, failure);
  fixture.oxygen.emit([0, 88, 0, 100, 0]);
  fixture.temperature.emit([0, 0x90, 0x01, 0, 0xff]);
  fixture.heart.emit([0, 201]);
  expect(reading).toHaveBeenLastCalledWith(
    expect.objectContaining({ heartRate: 201, spo2: 88, skinTemperature: 40, baselineFields: [] }),
  );
  source.stop();
  fixture.oxygen.emit([0]);
  fixture.temperature.emit([0]);
  expect(failure).not.toHaveBeenCalled();
});
