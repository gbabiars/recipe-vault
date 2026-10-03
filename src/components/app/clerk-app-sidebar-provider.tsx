"use client";

import type { ReactNode } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { AppSidebarStateProvider } from "./app-sidebar-context";

export function ClerkAppSidebarProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user } = useUser();

  return (
    <AppSidebarStateProvider
      value={{
        pathname,
        user: user
          ? {
              fullName: user.fullName,
              username: user.username,
              userImageUrl: user.imageUrl,
            }
          : null,
        onSignOut: () => signOut({ redirectUrl: "/sign-in" }),
      }}
    >
      {children}
    </AppSidebarStateProvider>
  );
}
