import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// The publishable key (sb_publishable_...) is safe to ship to the browser — it's the modern replacement
// for the old "anon key" and is meaningless without Row Level Security policies on the other side, which
// every table in this project has. Never put the secret/service_role key here.
const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const publishableKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;

let client: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!url || !publishableKey) {
    throw new Error("Supabase não está configurado (faltam VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY).");
  }
  client ??= createClient(url, publishableKey);
  return client;
}
