import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { z } from "zod";
import { SchemaForm } from "@/components/ui/form";
import { makeUser } from "@/test/factories";
const navigation = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/features/auth/api", () => ({
  authenticate: vi.fn(async () => ({
    user: makeUser(),
    expiresAt: Date.now() + 60000,
    capabilities: { safeEvents: false, simulatorIngestion: false, drillPracticeIngestion: false },
  })),
}));
import { LoginForm } from "@/features/auth/login-form";
afterEach(() => vi.useRealTimers());
it("disables server-rendered controls and enables them only after hydration", async () => {
  const form = (
    <SchemaForm
      fields={[{ name: "proof", label: "Government ID", required: true }]}
      schema={z.object({ proof: z.string() })}
      submit={async () => undefined}
      submitLabel="Sign in"
    />
  );
  const container = document.createElement("div");
  container.innerHTML = renderToString(form);
  document.body.append(container);
  expect(container.querySelector("form")).toHaveAttribute("data-hydrated", "false");
  expect(container.querySelector("input")).toBeDisabled();
  expect(container.querySelector("button")).toBeDisabled();
  let root: Root | undefined;
  try {
    await act(async () => {
      root = hydrateRoot(container, form);
    });
    await waitFor(() =>
      expect(container.querySelector("form")).toHaveAttribute("data-hydrated", "true"),
    );
    expect(container.querySelector("input")).toBeEnabled();
    expect(container.querySelector("button")).toBeEnabled();
  } finally {
    act(() => root?.unmount());
    container.remove();
  }
});
it("starts one role navigation without a competing refresh and cancels fallback on exit", async () => {
  vi.useFakeTimers();
  const client = new QueryClient();
  const view = render(
    <QueryClientProvider client={client}>
      <LoginForm />
    </QueryClientProvider>,
  );
  fireEvent.change(view.getByLabelText("Email", { exact: true }), {
    target: { value: "athlete@example.com" },
  });
  fireEvent.change(view.getByLabelText(/Aadhaar number|Government ID number/), {
    target: { value: "12345678" },
  });
  const form = view.getByRole("button", { name: "Sign in securely" }).closest("form");
  if (!form) throw new Error("Login form missing.");
  await act(async () => {
    fireEvent.submit(form);
  });
  expect(navigation.replace).toHaveBeenCalledWith("/athlete");
  expect(navigation.refresh).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(1);
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
  client.clear();
});
