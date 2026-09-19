import { UserProfile } from "@clerk/nextjs";
import { RecipeShell } from "@/features/recipes/recipe-shell";
import { requireUser } from "@/lib/auth/require-user";

/** Clerk owns account and API-key lifecycle; this route only applies app access policy. */
export default async function UserProfilePage() {
  await requireUser();

  return (
    <RecipeShell>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Profile</h1>
        </div>
      </div>
      <section className="profile-panel">
        <UserProfile path="/user-profile" routing="path" />
      </section>
    </RecipeShell>
  );
}
