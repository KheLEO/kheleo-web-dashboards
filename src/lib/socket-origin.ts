export function resolveSocketOrigin(value = "http://localhost:3000"): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("The Socket.IO URL must be an absolute HTTP(S) or WS(S) origin.");
  }
  if (
    !["http:", "https:", "ws:", "wss:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("The Socket.IO URL must contain only its scheme, hostname, and optional port.");
  }
  url.protocol =
    url.protocol === "wss:" ? "https:" : url.protocol === "ws:" ? "http:" : url.protocol;
  return url.origin;
}
