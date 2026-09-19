export const mcpKeyAccess = {
  read: ["recipes:read"],
  write: ["recipes:read", "recipes:write"],
} as const;

export type McpKeyAccess = keyof typeof mcpKeyAccess;
export type McpKeyExpirationDays = 30 | 90 | 365;

export function parseMcpKeyRequest(
  value: unknown,
):
  | { name: string; access: McpKeyAccess; expirationDays: McpKeyExpirationDays }
  | { error: string } {
  const name = typeof value === "object" && value ? (value as { name?: unknown }).name : undefined;
  const access =
    typeof value === "object" && value ? (value as { access?: unknown }).access : undefined;
  const expiration =
    typeof value === "object" && value ? (value as { expiration?: unknown }).expiration : undefined;
  if (typeof name !== "string" || !name.trim()) return { error: "Enter a name for this key." };
  if (name.trim().length > 100) return { error: "Key names must be 100 characters or fewer." };
  if (access !== "read" && access !== "write")
    return { error: "Choose the access this key needs." };
  if (expiration !== "30" && expiration !== "90" && expiration !== "365")
    return { error: "Choose when this key should expire." };
  return { name: name.trim(), access, expirationDays: Number(expiration) as McpKeyExpirationDays };
}

export function isMcpKey(scopes: string[]) {
  return scopes.includes("recipes:read") || scopes.includes("recipes:write");
}
