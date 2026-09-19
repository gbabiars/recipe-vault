import { redirect } from "next/navigation";
import { getCurrentUser } from "./server";

type User = { id: string; email?: string };

export function ensureAuthenticatedUser(user: User | null, onUnauthenticated: () => never): User {
  if (!user) return onUnauthenticated();
  return user;
}

/** Returns any user authenticated by this application's Clerk instance. */
export async function getAuthenticatedUser(): Promise<User | null> {
  return getCurrentUser();
}

export async function requireUser(): Promise<User> {
  return ensureAuthenticatedUser(await getCurrentUser(), () => redirect("/sign-in"));
}
