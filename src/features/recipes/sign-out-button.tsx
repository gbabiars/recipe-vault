"use client";

import { useClerk } from "@clerk/nextjs";

export function SignOutButton() {
  const { signOut } = useClerk();
  return (
    <button
      type="button"
      className="text-button"
      onClick={async () => {
        await signOut({ redirectUrl: "/sign-in" });
      }}
    >
      Sign out
    </button>
  );
}
