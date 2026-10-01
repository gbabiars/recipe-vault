"use client";

import type { ReactNode } from "react";
import { LDProvider } from "launchdarkly-react-client-sdk";
import type { LaunchDarklyUserConfig } from "@/lib/launchdarkly";

export function LaunchDarklyProvider({
  config,
  children,
}: {
  config: LaunchDarklyUserConfig | null;
  children: ReactNode;
}) {
  if (!config) return children;

  return (
    <LDProvider
      clientSideID={config.clientSideID}
      context={config.context}
      options={{ hash: config.hash }}
    >
      {children}
    </LDProvider>
  );
}
