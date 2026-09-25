import { UserProfile } from "@clerk/nextjs";
import { Card } from "@/components/ui/card";
import { PageContent, PageHeader, PageLayout } from "@/components/ui/page-layout";
import { requireUser } from "@/lib/auth/require-user";

/** Clerk owns account and API-key lifecycle; this route only applies app access policy. */
export default async function UserProfilePage() {
  await requireUser();

  return (
    <PageLayout>
      <PageHeader title="Profile" />
      <PageContent>
        <Card as="section" padding="large">
          <UserProfile path="/user-profile" routing="path" />
        </Card>
      </PageContent>
    </PageLayout>
  );
}
