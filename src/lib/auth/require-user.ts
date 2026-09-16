import { redirect } from "next/navigation";
import { getServerSupabaseClient } from "./server";

type User = { id: string; email?: string };

export function ensureAuthenticatedUser(user: User | null, onUnauthenticated: () => never): User {
  if (!user) return onUnauthenticated();
  return user;
}

export async function requireUser(): Promise<User> {
  const client = await getServerSupabaseClient();
  const { data: { user } } = await client.auth.getUser();
  return ensureAuthenticatedUser(user, () => redirect("/sign-in"));
}
