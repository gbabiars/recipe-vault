import { redirect } from "next/navigation";
import { getServerSupabaseClient } from "@/lib/auth/server";
import { OAuthConsent } from "@/features/recipes/oauth-consent";

type Props = { searchParams: Promise<{ authorization_id?: string }> };

export default async function OAuthConsentPage({ searchParams }: Props) {
  const authorizationId = (await searchParams).authorization_id;
  if (!authorizationId) return <main className="auth-page">Invalid authorization request.</main>;
  const {
    data: { user },
  } = await (await getServerSupabaseClient()).auth.getUser();
  if (!user)
    redirect(
      `/sign-in?next=${encodeURIComponent(`/oauth/consent?authorization_id=${authorizationId}`)}`,
    );
  if (!process.env.RECIPE_VAULT_OWNER_ID || user.id !== process.env.RECIPE_VAULT_OWNER_ID)
    return <main className="auth-page">Access denied.</main>;
  return (
    <main className="auth-page">
      <OAuthConsent authorizationId={authorizationId} />
    </main>
  );
}
