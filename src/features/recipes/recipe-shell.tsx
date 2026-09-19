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
        <div className="header-actions">
          <Link href="/user-profile">Profile</Link>
          <Link href="/mcp-keys">MCP keys</Link>
          <SignOutButton />
        </div>
      </header>
      {children}
    </main>
  );
}
