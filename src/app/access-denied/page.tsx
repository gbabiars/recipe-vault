import { SignOutButton } from "@/features/recipes/sign-out-button";

export default function AccessDeniedPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Access denied</h1>
        <p>This private recipe vault is not available to this account.</p>
        <SignOutButton />
      </section>
    </main>
  );
}
