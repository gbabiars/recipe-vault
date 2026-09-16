type Environment = Record<string, string | undefined>;

export type PublicSupabaseConfig = {
  url: string;
  publishableKey: string;
};

const requiredPublicSupabaseVariables = ["NEXT_PUBLIC_SUPABASE_URL"] as const;

function usableValue(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0 && !value.includes("your-");
}

/**
 * Validates the public values needed by Supabase browser and server clients.
 * The returned error names variables only; it never includes their values.
 */
export function validatePublicSupabaseConfig(env: Environment): PublicSupabaseConfig {
  const missing: string[] = requiredPublicSupabaseVariables.filter(
    (name) => !usableValue(env[name]),
  );
  const publishableKey =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!usableValue(publishableKey)) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  if (missing.length > 0) {
    throw new Error(`Missing required Supabase environment variables: ${missing.join(", ")}`);
  }

  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL as string,
    publishableKey: publishableKey as string,
  };
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig {
  return validatePublicSupabaseConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
