"use client";
import { createOptionalSupabaseClient } from "@/lib/supabase";
export interface ContactInput {
  email?: string | undefined;
  phone?: string | undefined;
}
export interface ContactChallenge {
  channel: "email" | "sms";
  contact: string;
  verify: (code: string) => Promise<string>;
}
export function contactProofConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
export async function beginContactProof(
  input: ContactInput,
  createUser: boolean,
): Promise<ContactChallenge> {
  if (Boolean(input.email) === Boolean(input.phone))
    throw new Error(
      "Use either email or phone for contact verification. Add the other contact from your profile.",
    );
  const client = createOptionalSupabaseClient();
  const contact = input.email ?? input.phone!;
  const credentials = input.email
    ? { email: contact, options: { shouldCreateUser: createUser } }
    : { phone: contact, options: { shouldCreateUser: createUser } };
  const sent = await client.auth.signInWithOtp(credentials);
  if (sent.error) throw sent.error;
  return {
    channel: input.email ? "email" : "sms",
    contact,
    verify: async (code: string) => {
      const response = await client.auth.verifyOtp(
        input.email
          ? { email: contact, token: code, type: "email" }
          : { phone: contact, token: code, type: "sms" },
      );
      if (response.error) throw response.error;
      if (!response.data.session?.access_token)
        throw new Error("Contact verification did not return a session. Request a new code.");
      return response.data.session.access_token;
    },
  };
}
