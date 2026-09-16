import { redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/auth/server";
import { SignInForm } from "@/features/recipes/sign-in-form";

type Props = { searchParams: Promise<{ next?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  const {
    data: { user },
  } = await (await getServerSupabaseClient()).auth.getUser();
  const next = (await searchParams).next;
  const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/recipes";
  if (user) redirect(destination);
  return (
    <main className="auth-page">
      <SignInForm destination={destination} />
    </main>
  );
}
