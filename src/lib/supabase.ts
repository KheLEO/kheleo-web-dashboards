import { createClient, type SupabaseClient } from "@supabase/supabase-js";
export function createOptionalSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Error(
      "Optional Supabase integration is not configured. Platform authentication uses the NestJS session relay.",
    );
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
