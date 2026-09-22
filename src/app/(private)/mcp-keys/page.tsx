import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Access</p>
          <h1>MCP keys</h1>
        </div>
      </div>
      <p className="lead">Create narrowly scoped keys for trusted MCP clients.</p>
      <McpKeyManager />
      <Card as="section" className="mcp-key-section" padding="large">
        <p>
          OAuth at <code>/mcp</code> is the recommended connection method. These keys are for
          clients that cannot complete OAuth and connect to <code>/api/mcp</code> instead.
        </p>
        <h2>Your MCP keys</h2>
        {error ? (
          <Card as="p" className="error-message" role="alert">
            {error}
          </Card>
        ) : keys.length === 0 ? (
          <Card as="p">No MCP keys have been created.</Card>
        ) : (
          <ul className="mcp-key-list">
            {keys.map((key) => (
              <Card as="li" key={key.id}>
                <div>
                  <h3>{key.name}</h3>
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
    </>
  );
}
