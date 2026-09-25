import styles from "@/features/mcp-keys/mcp-keys.module.css";
import Link from "next/link";
import { Breadcrumbs, BreadcrumbsItem } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { PageContent, PageHeader, PageLayout } from "@/components/ui/page-layout";
import { Inline } from "@/components/ui/inline";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";
import { McpKeyManager } from "@/features/mcp-keys/mcp-key-manager";
import { revokeMcpKeyAction } from "@/features/mcp-keys/actions";
import { listMcpApiKeys } from "@/lib/auth/clerk-api-keys";
import { requireUser } from "@/lib/auth/require-user";

function formatDate(value: number | null) {
  return value ? new Date(value).toLocaleDateString() : "Never";
}

export default async function McpKeysPage() {
  const user = await requireUser();
  let keys: Awaited<ReturnType<typeof listMcpApiKeys>> = [];
  let error: string | undefined;
  try {
    keys = await listMcpApiKeys(user.id);
  } catch {
    error = "MCP keys are unavailable right now. Please try again shortly.";
  }

  return (
    <PageLayout>
      <PageHeader
        title="MCP keys"
        overline={
          <Breadcrumbs trailingSeparator>
            <BreadcrumbsItem>
              <Link href="/settings">Settings</Link>
            </BreadcrumbsItem>
          </Breadcrumbs>
        }
        description="Create narrowly scoped keys for trusted MCP clients."
      />
      <PageContent>
        <Stack gap="200">
          <McpKeyManager />
          <Card as="section" padding="large">
            <Stack gap="150">
              <Text as="p">
                OAuth at <code>/mcp</code> is the recommended connection method. These keys are for
                clients that cannot complete OAuth and connect to <code>/api/mcp</code> instead.
              </Text>
              <Heading as="h2" level={3}>
                Your MCP keys
              </Heading>
              {error ? (
                <Card as="div" role="alert">
                  <Text as="p" appearance="error">
                    {error}
                  </Text>
                </Card>
              ) : keys.length === 0 ? (
                <Card as="div">
                  <Text as="p">No MCP keys have been created.</Text>
                </Card>
              ) : (
                <Stack as="ul" gap="200" className={styles.list}>
                  {keys.map((key) => (
                    <Card as="li" key={key.id}>
                      <Inline gap="150" align="center" justify="between">
                        <Stack gap="050" className={styles.keyDetails}>
                          <Heading as="h3" level={5}>
                            {key.name}
                          </Heading>
                          <Text as="p">{key.scopes.join(", ")}</Text>
                          <Text as="small" size="small" appearance="secondary">
                            Created {formatDate(key.createdAt)} · Last used{" "}
                            {formatDate(key.lastUsedAt)}
                            {` · Expires ${key.expiration ? formatDate(key.expiration) : "Never"}`}
                          </Text>
                        </Stack>
                        {key.revoked || key.expired ? (
                          <Text as="span" appearance="secondary">
                            {key.revoked ? "Revoked" : "Expired"}
                          </Text>
                        ) : (
                          <form action={revokeMcpKeyAction}>
                            <input type="hidden" name="apiKeyId" value={key.id} />
                            <Button type="submit" variant="danger">
                              Revoke
                            </Button>
                          </form>
                        )}
                      </Inline>
                    </Card>
                  ))}
                </Stack>
              )}
            </Stack>
          </Card>
        </Stack>
      </PageContent>
    </PageLayout>
  );
}
