"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { AppMobileNavigation } from "./app-mobile-navigation";

export function AppSidebarClient() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user } = useUser();
  const userName = user?.fullName?.trim() || user?.username?.trim() || "Account";

  const onSignOut = () => signOut({ redirectUrl: "/sign-in" });

  return (
    <>
      <AppSidebar pathname={pathname} userName={userName} onSignOut={onSignOut} />
      <AppMobileNavigation
        key={pathname}
        pathname={pathname}
        userName={userName}
        onSignOut={onSignOut}
      />
    </>
  );
}
