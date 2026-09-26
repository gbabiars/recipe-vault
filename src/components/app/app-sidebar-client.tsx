"use client";

import { useClerk } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { AppMobileNavigation } from "./app-mobile-navigation";

export function AppSidebarClient() {
  const pathname = usePathname();
  const { signOut } = useClerk();

  const onSignOut = () => signOut({ redirectUrl: "/sign-in" });

  return (
    <>
      <AppSidebar pathname={pathname} onSignOut={onSignOut} />
      <AppMobileNavigation key={pathname} pathname={pathname} onSignOut={onSignOut} />
    </>
  );
}
