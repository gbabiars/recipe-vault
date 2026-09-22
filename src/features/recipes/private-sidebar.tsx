"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./sign-out-button";

export function PrivateSidebar() {
  const pathname = usePathname();
  const recipesActive = pathname === "/recipes" || pathname.startsWith("/recipes/");
  const settingsActive =
    pathname === "/settings" ||
    pathname.startsWith("/user-profile") ||
    pathname.startsWith("/mcp-keys");

  return (
    <aside className="private-sidebar">
      <Link href="/recipes" className="brand">
        Recipe Vault
      </Link>
      <nav className="sidebar-nav" aria-label="Primary">
        <Link
          href="/recipes"
          className={recipesActive ? "sidebar-link active" : "sidebar-link"}
          aria-current={recipesActive ? "page" : undefined}
        >
          Recipes
        </Link>
        <Link
          href="/settings"
          className={settingsActive ? "sidebar-link active" : "sidebar-link"}
          aria-current={pathname === "/settings" ? "page" : undefined}
        >
          Settings
        </Link>
      </nav>
      <div className="sidebar-footer">
        <SignOutButton />
      </div>
    </aside>
  );
}
