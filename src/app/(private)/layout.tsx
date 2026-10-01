import styles from "./layout.module.css";
import type { ReactNode } from "react";
import { AppSidebarClient } from "@/components/app/app-sidebar-client";
import { ClerkAppSidebarProvider } from "@/components/app/clerk-app-sidebar-provider";
import { LaunchDarklyProvider } from "@/components/app/launchdarkly-provider";
import { requireUser } from "@/lib/auth/require-user";
import { createLaunchDarklyUserConfig } from "@/lib/launchdarkly";

export default async function PrivateLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const launchDarklyConfig = createLaunchDarklyUserConfig(user.id);

  return (
    <LaunchDarklyProvider config={launchDarklyConfig}>
      <div className={styles.privateLayout}>
        <ClerkAppSidebarProvider>
          <AppSidebarClient />
        </ClerkAppSidebarProvider>
        <main className={styles.appShell} id="main-content">
          {children}
        </main>
      </div>
    </LaunchDarklyProvider>
  );
}
