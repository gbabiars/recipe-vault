"use client";

import { useClerk } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";

export function AppSidebarClient() {
  const pathname = usePathname();
  const { signOut } = useClerk();

  return <AppSidebar pathname={pathname} onSignOut={() => signOut({ redirectUrl: "/sign-in" })} />;
}
