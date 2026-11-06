import { createClient, type SupabaseClient } from "@supabase/supabase-js";
export function createOptionalSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Error(
      "Contact verification is not configured. Set the public Supabase URL and publishable key for OTP verification.",
    );
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
