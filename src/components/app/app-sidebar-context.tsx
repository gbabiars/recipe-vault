"use client";

import { createContext, useContext, type ReactNode } from "react";

export type AppSidebarUser = {
  fullName?: string | null;
  username?: string | null;
};

export type AppSidebarState = {
  pathname: string;
  user: AppSidebarUser | null;
  onSignOut: () => void | Promise<void>;
};

const AppSidebarContext = createContext<AppSidebarState | null>(null);

export function AppSidebarStateProvider({
  value,
  children,
}: {
  value: AppSidebarState;
  children: ReactNode;
}) {
  return <AppSidebarContext.Provider value={value}>{children}</AppSidebarContext.Provider>;
}

export function useAppSidebarState() {
  const value = useContext(AppSidebarContext);
  if (!value) throw new Error("AppSidebarClient requires AppSidebarStateProvider.");
  return value;
}
