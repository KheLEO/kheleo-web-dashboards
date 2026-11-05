import { expect, it } from "vitest";
import { parseOxygenSaturation, parseTemperature } from "@/features/wearables/physiology-parsers";
const packet = (values: number[]): DataView => new DataView(Uint8Array.from(values).buffer);
it("parses oximeter SFLOAT measurements including fractional saturation", () => {
  expect(parseOxygenSaturation(packet([0, 98, 0, 70, 0]))).toBe(98);
  expect(parseOxygenSaturation(packet([0, 0xd5, 0xf3, 70, 0]))).toBeCloseTo(98.1);
  expect(() => parseOxygenSaturation(packet([0]))).toThrow("incomplete");
  expect(() => parseOxygenSaturation(packet([0, 0xff, 0x07]))).toThrow("unavailable");
});
it("parses IEEE 11073 thermometer floats and Fahrenheit flags", () => {
  expect(parseTemperature(packet([0, 0x70, 0x01, 0, 0xff]))).toBe(36.8);
  expect(parseTemperature(packet([1, 0xda, 0x03, 0, 0xff]))).toBe(37);
  expect(() => parseTemperature(packet([0, 0]))).toThrow("incomplete");
  expect(() => parseTemperature(packet([0, 0xff, 0xff, 0x7f, 0]))).toThrow("unavailable");
});
