import styles from "@/features/mcp-keys/mcp-keys.module.css";
import feedbackStyles from "../page-feedback.module.css";
import Link from "next/link";
import { Breadcrumbs, BreadcrumbsItem } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { PageContent, PageHeader, PageLayout } from "@/components/ui/page-layout";
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
        <McpKeyManager />
        <Card as="section" className={styles.section} padding="large">
          <p>
            OAuth at <code>/mcp</code> is the recommended connection method. These keys are for
            clients that cannot complete OAuth and connect to <code>/api/mcp</code> instead.
          </p>
          <Heading as="h2" level={3}>
            Your MCP keys
          </Heading>
          {error ? (
            <Card as="p" className={feedbackStyles.errorMessage} role="alert">
              {error}
            </Card>
          ) : keys.length === 0 ? (
            <Card as="p">No MCP keys have been created.</Card>
          ) : (
            <ul className={styles.list}>
              {keys.map((key) => (
                <Card as="li" key={key.id}>
                  <div>
                    <Heading as="h3" level={5}>
                      {key.name}
                    </Heading>
                    <p>{key.scopes.join(", ")}</p>
                    <small>
                      Created {formatDate(key.createdAt)} · Last used {formatDate(key.lastUsedAt)}
                      {` · Expires ${key.expiration ? formatDate(key.expiration) : "Never"}`}
                    </small>
                  </div>
                  {key.revoked || key.expired ? (
                    <span>{key.revoked ? "Revoked" : "Expired"}</span>
                  ) : (
                    <form action={revokeMcpKeyAction}>
                      <input type="hidden" name="apiKeyId" value={key.id} />
                      <Button type="submit" variant="danger">
                        Revoke
                      </Button>
                    </form>
                  )}
                </Card>
              ))}
            </ul>
          )}
        </Card>
      </PageContent>
    </PageLayout>
  );
}
