import type { NextConfig } from "next";
import { resolveSocketOrigin } from "./src/lib/socket-origin";

const socketOrigin = resolveSocketOrigin(
  process.env.NEXT_PUBLIC_SOCKET_ORIGIN ?? process.env.NEXT_PUBLIC_WS_URL,
);

const identityOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : "";

const config: NextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: { root: process.cwd() },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(self), bluetooth=(self)",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'" +
              (process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : "") +
              "; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' " +
              socketOrigin +
              " " +
              socketOrigin.replace(/^http/, "ws") +
              " " +
              identityOrigin +
              "; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
          },
        ],
      },
    ];
  },
};
export default config;
