export const mcpKeyAccess = {
  read: ["recipes:read"],
  write: ["recipes:read", "recipes:write"],
} as const;

export type McpKeyAccess = keyof typeof mcpKeyAccess;

export function parseMcpKeyRequest(
  value: unknown,
): { name: string; access: McpKeyAccess } | { error: string } {
  const name = typeof value === "object" && value ? (value as { name?: unknown }).name : undefined;
  const access =
    typeof value === "object" && value ? (value as { access?: unknown }).access : undefined;
  if (typeof name !== "string" || !name.trim()) return { error: "Enter a name for this key." };
  if (name.trim().length > 100) return { error: "Key names must be 100 characters or fewer." };
  if (access !== "read" && access !== "write")
    return { error: "Choose the access this key needs." };
  return { name: name.trim(), access };
}

export function isMcpKey(scopes: string[]) {
  return scopes.includes("recipes:read") || scopes.includes("recipes:write");
}
