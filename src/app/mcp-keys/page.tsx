import { RecipeShell } from "@/features/recipes/recipe-shell";
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
    <RecipeShell>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Access</p>
          <h1>MCP keys</h1>
        </div>
      </div>
      <p className="lead">Create narrowly scoped keys for trusted MCP clients.</p>
      <McpKeyManager />
      <section className="mcp-key-panel">
        <p>
          OAuth at <code>/mcp</code> is the recommended connection method. These keys are for
          clients that cannot complete OAuth and connect to <code>/api/mcp</code> instead.
        </p>
        <h2>Your MCP keys</h2>
        {error ? (
          <p className="error-panel" role="alert">
            {error}
          </p>
        ) : keys.length === 0 ? (
          <p className="empty-state">No MCP keys have been created.</p>
        ) : (
          <ul className="mcp-key-list">
            {keys.map((key) => (
              <li key={key.id}>
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
                    <button type="submit" className="danger-button">
                      Revoke
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </RecipeShell>
  );
}
