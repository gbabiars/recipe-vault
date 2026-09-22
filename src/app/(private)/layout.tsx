import type { ReactNode } from "react";
import { RecipeShell } from "@/features/recipes/recipe-shell";
import { requireUser } from "@/lib/auth/require-user";

export default async function PrivateLayout({ children }: { children: ReactNode }) {
  await requireUser();

  return <RecipeShell>{children}</RecipeShell>;
}
