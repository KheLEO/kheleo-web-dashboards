import { expect, it } from "vitest";
import inventory from "../../docs/contracts/backend-routes.json";
import { routeRegistry } from "@/server/api/route-registry";
const routes = inventory.map((route) => ({
  ...route,
  path: route.path
    .replace(/^\/api\/v1\//u, "")
    .replace("{sport}", "CRICKET")
    .replace(/\{[^}]+\}/gu, "10000000-0000-4000-8000-000000000001"),
}));
it.each(routeRegistry)(
  "relay $method $pattern has a real backend controller operation",
  (route) => {
    expect(
      routes.some((backend) => backend.method === route.method && route.pattern.test(backend.path)),
    ).toBe(true);
  },
);
it.each(["register", "login", "refresh", "logout"])(
  "session %s has a backend operation",
  (action) => {
    expect(routes.some((route) => route.method === "POST" && route.path === `auth/${action}`)).toBe(
      true,
    );
  },
);
