import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

export const mcpScopes = {
  read: "recipes:read",
  write: "recipes:write",
} as const;

export type McpScope = (typeof mcpScopes)[keyof typeof mcpScopes];
export type McpCredentialType = "oauth" | "api_key";

export type McpPrincipal = {
  userId: string;
  credentialType: McpCredentialType;
  scopes: ReadonlySet<string>;
};

/** Derives application identity only from verified MCP authentication data. */
export function mcpPrincipal(authInfo: AuthInfo | undefined): McpPrincipal | null {
  const userId = authInfo?.extra?.userId;
  const credentialType = authInfo?.extra?.credentialType;
  if (
    typeof userId !== "string" ||
    !userId.trim() ||
    (credentialType !== "oauth" && credentialType !== "api_key")
  )
    return null;
  return {
    userId: userId.trim(),
    credentialType,
    scopes: new Set(authInfo?.scopes ?? []),
  };
}

export function authorizeMcpTool(
  authInfo: AuthInfo | undefined,
  requiredScope: McpScope,
): McpPrincipal | null {
  const principal = mcpPrincipal(authInfo);
  return principal?.scopes.has(requiredScope) ? principal : null;
}
