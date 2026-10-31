export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}
export function jointAngle(a: Landmark, b: Landmark, c: Landmark): number | null {
  if (
    [a, b, c].some(
      (point) => point.visibility < 0.6 || ![point.x, point.y, point.z].every(Number.isFinite),
    )
  )
    return null;
  const ab = [a.x - b.x, a.y - b.y, a.z - b.z] as const;
  const cb = [c.x - b.x, c.y - b.y, c.z - b.z] as const;
  const magnitude = Math.hypot(...ab) * Math.hypot(...cb);
  if (magnitude < 1e-8) return null;
  const cosine = (ab[0] * cb[0] + ab[1] * cb[1] + ab[2] * cb[2]) / magnitude;
  return (Math.acos(Math.max(-1, Math.min(1, cosine))) * 180) / Math.PI;
}
export function kneeAngles(landmarks: Landmark[]): { left: number | null; right: number | null } {
  const angle = (hip: number, knee: number, ankle: number): number | null => {
    const a = landmarks[hip],
      b = landmarks[knee],
      c = landmarks[ankle];
    return a && b && c ? jointAngle(a, b, c) : null;
  };
  return { left: angle(23, 25, 27), right: angle(24, 26, 28) };
}
