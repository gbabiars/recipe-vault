import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignInPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  const next = (await searchParams).next;
  const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/recipes";

  if (user) redirect(destination);

  return (
    <main className="auth-page">
      <SignIn fallbackRedirectUrl={destination} />
    </main>
  );
}
