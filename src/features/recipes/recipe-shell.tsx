import type { ReactNode } from "react";
import { PrivateSidebar } from "./private-sidebar";

export function RecipeShell({ children }: { children: ReactNode }) {
  return (
    <div className="private-layout">
      <PrivateSidebar />
      <main className="app-shell" id="main-content">
        {children}
      </main>
    </div>
  );
}
