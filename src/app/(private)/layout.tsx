import styles from "./layout.module.css";
import type { ReactNode } from "react";
import { StatsigBootstrapProvider } from "@statsig/next";
import { AppSidebarClient } from "@/components/app/app-sidebar-client";
import StatsigIdentitySync from "@/app/statsig-identity-sync";
import { requireUser } from "@/lib/auth/require-user";

export default async function PrivateLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const clientKey = process.env.NEXT_PUBLIC_STATSIG_CLIENT_KEY;
  const serverKey = process.env.STATSIG_SERVER_KEY ?? process.env.STATSG_SECRET_KEY;
  if (!clientKey) throw new Error("Missing NEXT_PUBLIC_STATSIG_CLIENT_KEY");
  if (!serverKey) throw new Error("Missing STATSIG_SERVER_KEY");

  return (
    <StatsigBootstrapProvider
      user={{ userID: user.id }}
      clientKey={clientKey}
      serverKey={serverKey}
      useCookie={false}
      clientOptions={{ disableStableID: true }}
    >
      <StatsigIdentitySync initialUserID={user.id}>
        <div className={styles.privateLayout}>
          <AppSidebarClient />
          <main className={styles.appShell} id="main-content">
            {children}
          </main>
        </div>
      </StatsigIdentitySync>
    </StatsigBootstrapProvider>
  );
}
