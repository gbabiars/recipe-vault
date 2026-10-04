import styles from "./layout.module.css";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AppSidebarClient } from "@/components/app/app-sidebar-client";
import {
  APP_SIDEBAR_PREFERENCE_COOKIE,
  isAppSidebarCollapsedForUser,
} from "@/components/app/app-sidebar-preference";
import { ClerkAppSidebarProvider } from "@/components/app/clerk-app-sidebar-provider";
import { LaunchDarklyProvider } from "@/components/app/launchdarkly-provider";
import { requireUser } from "@/lib/auth/require-user";
import { createLaunchDarklyUserConfig } from "@/lib/launchdarkly";

export default async function PrivateLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const cookieStore = await cookies();
  const initialCollapsed = isAppSidebarCollapsedForUser(
    cookieStore.get(APP_SIDEBAR_PREFERENCE_COOKIE)?.value,
    user.id,
  );
  const launchDarklyConfig = createLaunchDarklyUserConfig(user.id);

  return (
    <LaunchDarklyProvider config={launchDarklyConfig}>
      <div className={styles.privateLayout}>
        <ClerkAppSidebarProvider>
          <AppSidebarClient initialCollapsed={initialCollapsed} />
        </ClerkAppSidebarProvider>
        <main className={styles.appShell} id="main-content">
          {children}
        </main>
      </div>
    </LaunchDarklyProvider>
  );
}
