import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicSupabaseConfig } from "@/lib/env";

/**
 * Creates a request-scoped server client backed by Next.js cookies.
 * Server Components cannot persist refreshed cookies; middleware can be added
 * when authentication routes are introduced in a later iteration.
 */
export async function getServerSupabaseClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getPublicSupabaseConfig();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Cookie writes are unavailable in Server Components.
        }
      },
    },
  });
}
