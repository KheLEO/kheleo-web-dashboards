export function parseHeartRate(value: DataView): number {
  if (value.byteLength < 2) throw new Error("The heart-rate packet is incomplete.");
  const sixteenBit = (value.getUint8(0) & 1) === 1;
  if (sixteenBit && value.byteLength < 3)
    throw new Error("The 16-bit heart-rate packet is incomplete.");
  const rate = sixteenBit ? value.getUint16(1, true) : value.getUint8(1);
  if (rate < 1 || rate > 300) throw new Error("The wearable returned an invalid heart rate.");
  return rate;
}
