import { UserProfile } from "@clerk/nextjs";
import Link from "next/link";
import { Breadcrumbs, BreadcrumbsItem } from "@/components/ui/breadcrumbs";
import { Card } from "@/components/ui/card";
import { PageContent, PageHeader, PageLayout } from "@/components/ui/page-layout";
import { requireUser } from "@/lib/auth/require-user";

/** Clerk owns account management; this route only applies app access policy. */
export default async function UserProfilePage() {
  await requireUser();

  return (
    <PageLayout>
      <PageHeader
        title="Profile"
        overline={
          <Breadcrumbs trailingSeparator>
            <BreadcrumbsItem>
              <Link href="/settings">Settings</Link>
            </BreadcrumbsItem>
          </Breadcrumbs>
        }
      />
      <PageContent>
        <Card as="section" padding="large">
          <UserProfile path="/user-profile" routing="path" />
        </Card>
      </PageContent>
    </PageLayout>
  );
}
