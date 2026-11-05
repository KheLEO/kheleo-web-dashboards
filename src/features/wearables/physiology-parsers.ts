function sfloat(value: DataView, offset: number): number {
  if (value.byteLength < offset + 2) throw new Error("The oximeter packet is incomplete.");
  const raw = value.getUint16(offset, true);
  const mantissa = raw & 0x0fff;
  if ([0x07fe, 0x07ff, 0x0800, 0x0801, 0x0802].includes(mantissa))
    throw new Error("The oximeter measurement is unavailable.");
  const exponent = raw >> 12;
  return (
    (mantissa >= 0x800 ? mantissa - 0x1000 : mantissa) *
    10 ** (exponent >= 8 ? exponent - 16 : exponent)
  );
}
export function parseOxygenSaturation(value: DataView): number {
  const result = sfloat(value, 1);
  if (!Number.isFinite(result) || result < 50 || result > 100)
    throw new Error("The oximeter returned an invalid saturation.");
  return result;
}
export function parseTemperature(value: DataView): number {
  if (value.byteLength < 5) throw new Error("The thermometer packet is incomplete.");
  const raw = value.getUint32(1, true);
  const mantissa = raw & 0xffffff;
  if ([0x7ffffe, 0x7fffff, 0x800000, 0x800001, 0x800002].includes(mantissa))
    throw new Error("The thermometer measurement is unavailable.");
  const measured =
    (mantissa >= 0x800000 ? mantissa - 0x1000000 : mantissa) * 10 ** value.getInt8(4);
  const result = value.getUint8(0) & 1 ? ((measured - 32) * 5) / 9 : measured;
  if (!Number.isFinite(result) || result < 25 || result > 45)
    throw new Error("The thermometer returned an invalid temperature.");
  return Number(result.toFixed(2));
}
