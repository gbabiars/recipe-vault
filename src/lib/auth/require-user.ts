import { redirect } from "next/navigation";
import { getCurrentUser } from "./server";

type User = { id: string; email?: string };

export function ensureAuthenticatedUser(user: User | null, onUnauthenticated: () => never): User {
  if (!user) return onUnauthenticated();
  return user;
}

export function isPrivateOwner(user: User | null, ownerId: string | undefined): user is User {
  return Boolean(user && ownerId?.trim() && user.id === ownerId.trim());
}

export async function getPrivateUser(): Promise<User | null> {
  const user = await getCurrentUser();
  return isPrivateOwner(user, process.env.RECIPE_VAULT_OWNER_ID) ? user : null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  const authenticated = ensureAuthenticatedUser(user, () => redirect("/sign-in"));
  if (!isPrivateOwner(authenticated, process.env.RECIPE_VAULT_OWNER_ID)) redirect("/access-denied");
  return authenticated;
}
