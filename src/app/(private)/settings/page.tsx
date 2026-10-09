import { Card } from "@/components/ui/card";
import { List, ListItem } from "@/components/ui/list";
import { PageContent, PageHeader, PageLayout } from "@/components/ui/page-layout";
import { Stack } from "@/components/ui/stack";

export default function SettingsPage() {
  return (
    <PageLayout>
      <PageHeader title="Settings" />
      <PageContent>
        <Stack gap="200">
          <Card padding="none">
            <Stack paddingBlock="100" paddingInline="0">
              <List aria-label="Settings">
                <ListItem
                  title="Profile"
                  href="/user-profile"
                  description="Manage your account details."
                />
              </List>
            </Stack>
          </Card>
        </Stack>
      </PageContent>
    </PageLayout>
  );
}
