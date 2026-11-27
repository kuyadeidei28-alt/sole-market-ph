import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Explicitly persist browser sessions in localStorage so route changes and
// full page navigations on the same domain keep the seller signed in.
const browserStorage =
  typeof window !== "undefined" ? window.localStorage : undefined;

export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce",
          storage: browserStorage,
        },
      })
    : null;
