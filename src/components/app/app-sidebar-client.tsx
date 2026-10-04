"use client";

import { useRef, useState } from "react";
import { setAppSidebarCollapsed } from "./app-sidebar-actions";
import { useAppSidebarState } from "./app-sidebar-context";
import { AppSidebar } from "./app-sidebar";
import { AppMobileNavigation } from "./app-mobile-navigation";

export function AppSidebarClient({ initialCollapsed = false }: { initialCollapsed?: boolean }) {
  const { pathname, user, onSignOut } = useAppSidebarState();
  const userName = user?.fullName?.trim() || user?.username?.trim() || "Account";
  const userImageUrl = user?.userImageUrl;
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const collapsedRef = useRef(initialCollapsed);
  const persistedCollapsedRef = useRef(initialCollapsed);
  const saveVersionRef = useRef(0);
  const pendingSaveRef = useRef(Promise.resolve());

  function toggleCollapse() {
    const nextCollapsed = !collapsedRef.current;
    collapsedRef.current = nextCollapsed;
    setCollapsed(nextCollapsed);

    const saveVersion = ++saveVersionRef.current;
    pendingSaveRef.current = pendingSaveRef.current
      .catch(() => undefined)
      .then(() => setAppSidebarCollapsed(nextCollapsed))
      .then(() => {
        persistedCollapsedRef.current = nextCollapsed;
      })
      .catch(() => {
        if (saveVersionRef.current === saveVersion) {
          collapsedRef.current = persistedCollapsedRef.current;
          setCollapsed(persistedCollapsedRef.current);
        }
      });
  }

  return (
    <>
      <AppSidebar
        pathname={pathname}
        userName={userName}
        userImageUrl={userImageUrl}
        onSignOut={onSignOut}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
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
