import { describe, expect, it } from "vitest";
import { resolveSocketOrigin } from "@/lib/socket-origin";

describe("Socket.IO and CSP origin configuration", () => {
  it("uses the same HTTP origin for websocket URLs and trailing slashes", () => {
    expect(resolveSocketOrigin()).toBe("http://localhost:3000");
    expect(resolveSocketOrigin("wss://events.example.com/")).toBe("https://events.example.com");
    expect(resolveSocketOrigin("ws://localhost:4100")).toBe("http://localhost:4100");
    expect(resolveSocketOrigin("https://events.example.com:8443")).toBe(
      "https://events.example.com:8443",
    );
  });

  it.each([
    "https://events.example.com/api/v1",
    "https://events.example.com?token=private",
    "https://events.example.com#room",
    "https://user:private@events.example.com",
    "javascript:alert(1)",
    "https://events.example.com; connect-src *",
    "",
  ])("rejects unsafe or ambiguous configuration %s", (value) => {
    expect(() => resolveSocketOrigin(value)).toThrow();
  });
});
