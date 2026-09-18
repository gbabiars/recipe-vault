export type McpApiKeyAuth = {
  isAuthenticated: boolean;
  tokenType: string | null;
  subject: string | null;
  scopes: string[] | null;
};

type JsonRpcRequest = {
  method?: unknown;
  params?: { name?: unknown };
};

const readTools = new Set(["search_recipes", "get_recipe"]);

/** Determines the least Clerk API-key scope for an MCP protocol request. */
export function requiredMcpScope(
  request: JsonRpcRequest | null,
): "recipes:read" | "recipes:write" | null {
  if (request?.method !== "tools/call") return null;
  if (request.params?.name === "save_recipe") return "recipes:write";
  return readTools.has(String(request.params?.name)) ? "recipes:read" : null;
}

/**
 * API keys are opaque Clerk credentials, not Supabase JWTs. Keep their
 * authorization decision entirely at the HTTP boundary before any data client
 * is created.
 */
export function authorizesMcpApiKey(
  apiKey: McpApiKeyAuth,
  ownerId: string | undefined,
  requiredScope: "recipes:read" | "recipes:write" | null,
) {
  if (
    !apiKey.isAuthenticated ||
    apiKey.tokenType !== "api_key" ||
    !ownerId?.trim() ||
    apiKey.subject !== ownerId.trim()
  )
    return false;
  const scopes = new Set(apiKey.scopes ?? []);
  if (requiredScope) return scopes.has(requiredScope);
  return scopes.has("recipes:read") || scopes.has("recipes:write");
}
