"use client";
export function resolveColor(token: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim();
  return `rgb(${value})`;
}
