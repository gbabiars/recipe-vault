import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { isPrivateOwner } from "@/lib/auth/require-user";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignInPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  const next = (await searchParams).next;
  const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/recipes";

  if (isPrivateOwner(user, process.env.RECIPE_VAULT_OWNER_ID)) redirect(destination);
  if (user) redirect("/access-denied");

  return (
    <main className="auth-page">
      <SignIn fallbackRedirectUrl={destination} />
    </main>
  );
}
