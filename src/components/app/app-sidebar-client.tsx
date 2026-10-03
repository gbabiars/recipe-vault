"use client";

import { useAppSidebarState } from "./app-sidebar-context";
import { AppSidebar } from "./app-sidebar";
import { AppMobileNavigation } from "./app-mobile-navigation";

export function AppSidebarClient() {
  const { pathname, user, onSignOut } = useAppSidebarState();
  const userName = user?.fullName?.trim() || user?.username?.trim() || "Account";
  const userImageUrl = user?.userImageUrl;

  return (
    <>
      <AppSidebar
        pathname={pathname}
        userName={userName}
        userImageUrl={userImageUrl}
        onSignOut={onSignOut}
      />
      <AppMobileNavigation
        key={pathname}
        pathname={pathname}
        userName={userName}
        userImageUrl={userImageUrl}
        onSignOut={onSignOut}
      />
    </>
  );
}
