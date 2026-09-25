import headingStyles from "../../page-heading.module.css";
import { UserProfile } from "@clerk/nextjs";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { requireUser } from "@/lib/auth/require-user";

/** Clerk owns account and API-key lifecycle; this route only applies app access policy. */
export default async function UserProfilePage() {
  await requireUser();

  return (
    <>
      <div className={headingStyles.pageHeading}>
        <div>
          <Heading>Profile</Heading>
        </div>
      </div>
      <Card as="section" padding="large">
        <UserProfile path="/user-profile" routing="path" />
      </Card>
    </>
  );
}
