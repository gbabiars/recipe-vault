import { redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/auth/server";
import { SignInForm } from "@/features/recipes/sign-in-form";

export default async function SignInPage() {
  const {
    data: { user },
  } = await (await getServerSupabaseClient()).auth.getUser();
  if (user) redirect("/recipes");
  return (
    <main className="auth-page">
      <SignInForm />
    </main>
  );
}
