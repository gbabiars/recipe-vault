"use client";

import { useRouter } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/auth/browser";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-button"
      onClick={async () => {
        await getBrowserSupabaseClient().auth.signOut();
        router.replace("/sign-in");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
