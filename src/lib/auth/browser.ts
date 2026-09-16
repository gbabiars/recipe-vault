import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig } from "@/lib/env";

let browserClient: SupabaseClient | undefined;

/** Returns the singleton browser client using only Supabase's public project key. */
export function getBrowserSupabaseClient(): SupabaseClient {
  if (!browserClient) {
    const { url, publishableKey } = getPublicSupabaseConfig();
    browserClient = createBrowserClient(url, publishableKey);
  }

  return browserClient;
}
