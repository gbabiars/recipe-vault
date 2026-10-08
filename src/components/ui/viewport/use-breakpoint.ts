"use client";

import { useSyncExternalStore } from "react";

import { getServerSnapshot } from "./server-snapshot";

export const BREAKPOINT_MEDIA_QUERIES = {
  sm: "(width >= 640px)",
  md: "(width >= 768px)",
  lg: "(width >= 1024px)",
  xl: "(width >= 1440px)",
} as const;

export type Breakpoint = keyof typeof BREAKPOINT_MEDIA_QUERIES;

type Store = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => boolean;
  getServerSnapshot: () => boolean;
};

const stores = Object.fromEntries(
  Object.entries(BREAKPOINT_MEDIA_QUERIES).map(([breakpoint, query]) => {
    const store: Store = {
      subscribe(listener) {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
          return () => undefined;
        }

        const mediaQuery = window.matchMedia(query);
        mediaQuery.addEventListener("change", listener);
        return () => mediaQuery.removeEventListener("change", listener);
      },
      getSnapshot() {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
        return window.matchMedia(query).matches;
      },
      getServerSnapshot,
    };

    return [breakpoint, store];
  }),
) as Record<Breakpoint, Store>;

/** Returns whether the viewport is at or above the named breakpoint. */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  const store = stores[breakpoint];
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
