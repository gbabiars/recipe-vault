import type { ReactNode } from "react";
import { AppSidebarClient } from "@/components/app/app-sidebar-client";
import { requireUser } from "@/lib/auth/require-user";

export default async function PrivateLayout({ children }: { children: ReactNode }) {
  await requireUser();

  return (
    <div className="private-layout">
      <AppSidebarClient />
      <main className="app-shell" id="main-content">
        {children}
      </main>
    </div>
  );
}
