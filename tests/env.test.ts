import assert from "node:assert/strict";
import test from "node:test";
import { validatePublicSupabaseConfig } from "../src/lib/env";

test("returns public Supabase configuration when required values are present", () => {
  const config = validatePublicSupabaseConfig({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
  });

  assert.deepEqual(config, {
    url: "https://example.supabase.co",
    anonKey: "public-anon-key",
  });
});

test("reports missing variable names without echoing values", () => {
  assert.throws(
    () =>
      validatePublicSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      }),
    /NEXT_PUBLIC_SUPABASE_ANON_KEY/,
  );
});
