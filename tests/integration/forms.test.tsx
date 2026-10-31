import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { SchemaForm } from "@/components/ui/form";
import { loginSchema } from "@/contracts/auth";
import { authFields } from "@/features/auth/schemas";
afterEach(cleanup);
it("submits nested Gov-ID fields and clears the proof after success", async () => {
  const submit = vi.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  render(
    <SchemaForm schema={loginSchema} fields={authFields} submit={submit} submitLabel="Sign in" />,
  );
  await user.type(screen.getByLabelText("Email", { exact: true }), "athlete@example.com");
  await user.selectOptions(screen.getByLabelText("Government document"), "AADHAAR");
  await user.type(screen.getByLabelText("Government ID number"), "12345678");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
  expect(submit.mock.calls[0]?.[0]).toEqual({
    email: "athlete@example.com",
    governmentId: { idType: "AADHAAR", idNumber: "12345678" },
  });
  await waitFor(() => expect(screen.getByLabelText("Government ID number")).toHaveValue(""));
});
