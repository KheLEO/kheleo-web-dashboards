"use client";
import type { RefObject } from "react";
import type { Landmark } from "./joint-angles";
export const skeletonConnections = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
] as const;
export function drawLandmarks(canvas: HTMLCanvasElement, landmarks: Landmark[]): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  const color = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
  context.strokeStyle = `rgb(${color})`;
  context.fillStyle = `rgb(${color})`;
  context.lineWidth = 3;
  for (const [start, end] of skeletonConnections) {
    const a = landmarks[start],
      b = landmarks[end];
    if (!a || !b || a.visibility < 0.6 || b.visibility < 0.6) continue;
    context.beginPath();
    context.moveTo(a.x * canvas.width, a.y * canvas.height);
    context.lineTo(b.x * canvas.width, b.y * canvas.height);
    context.stroke();
  }
  for (const point of landmarks) {
    if (point.visibility < 0.6) continue;
    context.beginPath();
    context.arc(point.x * canvas.width, point.y * canvas.height, 3, 0, Math.PI * 2);
    context.fill();
  }
}
export function LandmarkOverlay({ canvasRef }: { canvasRef: RefObject<HTMLCanvasElement | null> }) {
  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={480}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-label="Skeletal tracking overlay"
    />
  );
}
