import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutButton } from "./sign-out-button";

export function RecipeShell({ children }: { children: ReactNode }) {
  return (
    <main className="app-shell">
      <header className="site-header">
        <Link href="/recipes" className="brand">
          Recipe Vault
        </Link>
        <SignOutButton />
      </header>
      {children}
    </main>
  );
}
