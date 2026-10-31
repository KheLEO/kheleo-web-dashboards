import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { SchemaForm } from "@/components/ui/form";
import { createGlobalQueryClient } from "@/providers/QueryProvider";
import { ApiError } from "@/lib/api/errors";
import type { MutationOperation } from "@/lib/api/operation";
import ErrorPage from "@/app/error";
afterEach(() => vi.useRealTimers());
it("settles only the latest search state after 300 ms and clears timers on exit", () => {
  vi.useFakeTimers();
  const hook = renderHook(({ value }: { value: string }) => useDebouncedValue(value, 300), {
    initialProps: { value: "initial" },
  });
  hook.rerender({ value: "first" });
  act(() => vi.advanceTimersByTime(200));
  hook.rerender({ value: "latest" });
  act(() => vi.advanceTimersByTime(299));
  expect(hook.result.current).toBe("initial");
  act(() => vi.advanceTimersByTime(1));
  expect(hook.result.current).toBe("latest");
  hook.rerender({ value: "pending" });
  hook.unmount();
  expect(vi.getTimerCount()).toBe(0);
});
it("locks rapid form submissions and retains an immutable operation for explicit retry", async () => {
  let release: (() => void) | undefined;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  const attempts: MutationOperation[] = [];
  const submit = vi.fn(async (_value: { name: string }, operation: MutationOperation) => {
    attempts.push(operation);
    await waiting;
    throw new Error("Transient failure");
  });
  render(
    <SchemaForm
      fields={[{ name: "name", label: "Test name", required: true }]}
      schema={z.object({ name: z.string().min(1) })}
      submitLabel="Submit test"
      submit={submit}
    />,
  );
  fireEvent.change(screen.getByLabelText("Test name"), { target: { value: "Original" } });
  const form = screen.getByRole("button", { name: "Submit test" }).closest("form");
  if (!form) throw new Error("Form missing");
  act(() => {
    fireEvent.submit(form);
    fireEvent.submit(form);
  });
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
  act(() => release?.());
  await screen.findByText("Transient failure");
  fireEvent.submit(form);
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
  expect(attempts[1]).toEqual(attempts[0]);
});
it("uses bounded query caches, disables mutation retries and does not retry throttling", async () => {
  const client = createGlobalQueryClient();
  const options = client.getDefaultOptions();
  expect(options.mutations?.retry).toBe(false);
  expect(options.queries?.gcTime).toBe(120000);
  const retry = options.queries?.retry;
  if (typeof retry !== "function") throw new Error("Retry policy missing");
  expect(
    retry(
      0,
      new ApiError({
        type: "about:blank",
        title: "Throttled",
        status: 429,
        detail: "Wait",
        instance: "",
        timestamp: "now",
      }),
    ),
  ).toBe(false);
  let release: (() => void) | undefined;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queryFn = vi.fn(async () => {
    await waiting;
    return 42;
  });
  const calls = Array.from({ length: 50 }, () =>
    client.fetchQuery({ queryKey: ["same-resource"], queryFn }),
  );
  expect(queryFn).toHaveBeenCalledOnce();
  release?.();
  expect(await Promise.all(calls)).toEqual(Array.from({ length: 50 }, () => 42));
  client.clear();
});
it("connects recovery to retry without displaying raw exception details", () => {
  const retry = vi.fn();
  render(<ErrorPage error={new Error("sensitive-exception-details")} retry={retry} />);
  expect(screen.queryByText("sensitive-exception-details")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(retry).toHaveBeenCalledOnce();
});
