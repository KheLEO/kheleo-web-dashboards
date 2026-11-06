import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beginContactProof } from "@/features/auth/contact-proof.client";
import { useContactProof } from "@/features/auth/use-contact-proof";
import { useState } from "react";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
function provider() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://identity.example.test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-test-key");
  const fetcher = vi.fn<typeof fetch>().mockImplementation(
    async (url) =>
      new Response(
        JSON.stringify(
          String(url).includes("/verify")
            ? {
                access_token: "verified-proof",
                refresh_token: "provider-refresh",
                token_type: "bearer",
                expires_in: 3600,
                user: {
                  id: "10000000-0000-4000-8000-000000000001",
                  email: "athlete@example.test",
                },
              }
            : {},
        ),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  );
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
it("sends only contact details to the provider and returns the verified proof", async () => {
  const fetcher = provider();
  const challenge = await beginContactProof({ email: "athlete@example.test" }, true);
  expect(fetcher.mock.calls[0]?.[0]).toBe("https://identity.example.test/auth/v1/otp");
  const sent = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
  expect(sent).toMatchObject({ email: "athlete@example.test", create_user: true });
  expect(sent).not.toHaveProperty("governmentId");
  expect(await challenge.verify("123456")).toBe("verified-proof");
  expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))).toMatchObject({
    email: "athlete@example.test",
    token: "123456",
    type: "email",
  });
});
it("rejects ambiguous contacts and propagates provider failures", async () => {
  const fetcher = provider();
  await expect(
    beginContactProof({ email: "a@example.test", phone: "+919876543210" }, false),
  ).rejects.toThrow("either email or phone");
  expect(fetcher).not.toHaveBeenCalled();
  fetcher.mockResolvedValueOnce(
    new Response(JSON.stringify({ msg: "Delivery refused" }), {
      status: 429,
      headers: { "content-type": "application/json" },
    }),
  );
  await expect(beginContactProof({ phone: "+919876543210" }, false)).rejects.toThrow(
    "Delivery refused",
  );
});
function ProofHarness() {
  const proof = useContactProof();
  const [result, setResult] = useState("waiting");
  return (
    <>
      {proof.dialog}
      <button
        onClick={() => {
          void proof
            .verify({ email: "athlete@example.test" }, false)
            .then((token) => setResult(token ?? "missing"))
            .catch((error: unknown) =>
              setResult(error instanceof Error ? error.message : "failed"),
            );
        }}
      >
        Start verification
      </button>
      <output>{result}</output>
    </>
  );
}
it("waits for the OTP before resolving a contact proof", async () => {
  provider();
  const user = userEvent.setup();
  render(<ProofHarness />);
  await user.click(screen.getByRole("button", { name: "Start verification" }));
  expect(await screen.findByRole("dialog")).toBeVisible();
  expect(screen.getByText("waiting")).toBeVisible();
  await user.type(screen.getByLabelText("Verification code"), "123456");
  await user.click(screen.getByRole("button", { name: "Verify and continue" }));
  await waitFor(() => expect(screen.getByText("verified-proof")).toBeVisible());
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("cancels verification without submitting an unverified proof", async () => {
  const fetcher = provider();
  const user = userEvent.setup();
  render(<ProofHarness />);
  await user.click(screen.getByRole("button", { name: "Start verification" }));
  await user.click(await screen.findByRole("button", { name: "Cancel verification" }));
  await waitFor(() => expect(screen.getByText("Contact verification cancelled")).toBeVisible());
  expect(fetcher).toHaveBeenCalledTimes(1);
});
