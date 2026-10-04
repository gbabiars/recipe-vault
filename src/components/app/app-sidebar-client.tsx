"use client";

import { useState } from "react";
import { useAppSidebarState } from "./app-sidebar-context";
import { AppSidebar } from "./app-sidebar";
import { AppMobileNavigation } from "./app-mobile-navigation";

export function AppSidebarClient() {
  const { pathname, user, onSignOut } = useAppSidebarState();
  const userName = user?.fullName?.trim() || user?.username?.trim() || "Account";
  const userImageUrl = user?.userImageUrl;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <AppSidebar
        pathname={pathname}
        userName={userName}
        userImageUrl={userImageUrl}
        onSignOut={onSignOut}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
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
