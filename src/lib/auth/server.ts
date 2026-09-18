import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig } from "@/lib/env";

/** Creates an RLS-scoped client using the active Clerk browser session token. */
export async function getServerSupabaseClient() {
  const { url, publishableKey } = getPublicSupabaseConfig();
  const { getToken } = await auth();
  return createClient(url, publishableKey, { accessToken: getToken });
}

/** Returns Clerk identity only; it never asks Supabase to interpret a session. */
export async function getCurrentUser() {
  const { userId } = await auth();
  return userId ? { id: userId } : null;
}

/**
 * This credential bypasses RLS and is reserved for the API-key MCP adapter.
 * That adapter authenticates a Clerk key, checks the sole private owner and
 * scope before this client is constructed. Never use it for browser traffic.
 */
export function getMcpSupabaseClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error("MCP Supabase service credential is not configured.");
  const { url } = getPublicSupabaseConfig();
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
