import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SchemaForm } from "@/components/ui/form";
import { loginSchema } from "@/contracts/auth";
import { authFields } from "@/features/auth/schemas";

vi.mock("@/features/auth/session-provider", () => ({
  useSession: () => ({
    user: { id: "10000000-0000-4000-8000-000000000001", role: "ATHLETE", isVerified: true },
  }),
}));

vi.mock("@/features/passport/api", () => ({
  savePassport: vi.fn().mockResolvedValue({}),
}));

import { ProfileForm } from "@/features/passport/profile-form";

afterEach(cleanup);
it("submits nested Gov-ID fields and clears the proof after success", async () => {
  const submit = vi.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  render(
    <SchemaForm
      schema={loginSchema}
      fields={authFields}
      defaults={{ "governmentId.idType": "AADHAAR" }}
      submit={submit}
      submitLabel="Sign in"
    />,
  );
  await user.type(screen.getByLabelText("Email", { exact: true }), "athlete@example.com");
  await user.type(screen.getByLabelText(/Aadhaar number|Government ID number/), "12345678");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
  expect(submit.mock.calls[0]?.[0]).toEqual({
    email: "athlete@example.com",
    governmentId: { idType: "AADHAAR", idNumber: "12345678" },
  });
  await waitFor(() =>
    expect(screen.getByLabelText(/Aadhaar number|Government ID number/)).toHaveValue(""),
  );
});

it("renders cascading State and District dropdowns with multi-sport chips", async () => {
  const client = new QueryClient();
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={client}>
      <ProfileForm />
    </QueryClientProvider>,
  );

  const stateSelect = screen.getByLabelText("State / Union Territory");
  const districtSelect = screen.getByLabelText("District");

  // District should be disabled when no state is selected
  expect(districtSelect).toBeDisabled();
  expect(screen.getByText("Select a state first...")).toBeInTheDocument();

  // Select Jharkhand
  await user.selectOptions(stateSelect, "Jharkhand");
  expect(districtSelect).toBeEnabled();

  // Districts for Jharkhand should be present
  expect(screen.getByRole("option", { name: "East Singhbhum" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Seraikela Kharsawan" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Ranchi" })).toBeInTheDocument();

  // Select East Singhbhum
  await user.selectOptions(districtSelect, "East Singhbhum");
  expect(districtSelect).toHaveValue("East Singhbhum");

  // Changing to Uttar Pradesh resets district
  await user.selectOptions(stateSelect, "Uttar Pradesh");
  expect(districtSelect).toHaveValue("");
  expect(screen.getByRole("option", { name: "Ghaziabad" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Varanasi" })).toBeInTheDocument();

  // Check Dominant Hand / Stance options
  expect(screen.getByRole("option", { name: "Right-handed / Right-footed" })).toBeInTheDocument();

  // Check scout search visibility friendly labels
  expect(
    screen.getByRole("option", {
      name: "Yes — Make my profile visible to verified Scouts & Academies",
    }),
  ).toBeInTheDocument();

  // Select Primary sport as Cricket
  const primarySportSelect = screen.getByLabelText("Primary sport");
  await user.selectOptions(primarySportSelect, "CRICKET");

  // Other sports chips should not include Cricket, but should include Football
  expect(screen.queryByRole("button", { name: "Cricket" })).not.toBeInTheDocument();
  const footballChip = screen.getByRole("button", { name: "Football" });
  expect(footballChip).toHaveAttribute("aria-pressed", "false");
  await user.click(footballChip);
  expect(footballChip).toHaveAttribute("aria-pressed", "true");
});
