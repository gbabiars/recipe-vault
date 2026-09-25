import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { PageContent, PageHeader, PageLayout } from "@/components/ui/page-layout";
import { Stack } from "@/components/ui/stack";

export default function SettingsPage() {
  return (
    <PageLayout>
      <PageHeader title="Settings" />
      <PageContent>
        <Stack gap="200">
          <Card as="section" label="Profile" render={<Link href="/user-profile" />}>
            <Heading as="h2" level={5}>
              Profile
            </Heading>
            <Text as="p" appearance="secondary">
              Manage your account details.
            </Text>
          </Card>
          <Card as="section" label="MCP keys" render={<Link href="/mcp-keys" />}>
            <Heading as="h2" level={5}>
              MCP keys
            </Heading>
            <Text as="p" appearance="secondary">
              Manage keys for MCP clients.
            </Text>
          </Card>
        </Stack>
      </PageContent>
    </PageLayout>
  );
}
