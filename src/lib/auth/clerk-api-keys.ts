type ClerkApiKeyResponse = {
  id: string;
  name: string;
  subject: string;
  scopes: string[];
  secret?: string;
  created_at?: number;
  createdAt?: number;
  last_used_at?: number | null;
  lastUsedAt?: number | null;
  revoked?: boolean;
  expired?: boolean;
};

export type ManagedMcpApiKey = {
  id: string;
  name: string;
  scopes: string[];
  createdAt: number | null;
  lastUsedAt: number | null;
  revoked: boolean;
  expired: boolean;
};

export type CreatedMcpApiKey = ManagedMcpApiKey & { secret: string };

const clerkApiUrl = "https://api.clerk.com/v1";

function getClerkSecretKey() {
  const key = process.env.CLERK_SECRET_KEY?.trim();
  if (!key) throw new Error("Clerk server credentials are not configured.");
  return key;
}

async function clerkRequest(path: string, init?: RequestInit) {
  const response = await fetch(`${clerkApiUrl}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${getClerkSecretKey()}`,
      "content-type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Clerk API key request failed.");
  return response.json() as Promise<unknown>;
}

function asApiKey(value: unknown): ClerkApiKeyResponse {
  if (!value || typeof value !== "object") throw new Error("Invalid Clerk API key response.");
  const key = value as Partial<ClerkApiKeyResponse>;
  if (
    typeof key.id !== "string" ||
    typeof key.name !== "string" ||
    typeof key.subject !== "string" ||
    !Array.isArray(key.scopes)
  )
    throw new Error("Invalid Clerk API key response.");
  return key as ClerkApiKeyResponse;
}

function toManagedKey(key: ClerkApiKeyResponse): ManagedMcpApiKey {
  return {
    id: key.id,
    name: key.name,
    scopes: key.scopes,
    createdAt: key.created_at ?? key.createdAt ?? null,
    lastUsedAt: key.last_used_at ?? key.lastUsedAt ?? null,
    revoked: Boolean(key.revoked),
    expired: Boolean(key.expired),
  };
}

/** Creates an opaque Clerk key that is restricted to Recipe Vault's MCP scopes. */
export async function createMcpApiKey(
  userId: string,
  name: string,
  scopes: string[],
): Promise<CreatedMcpApiKey> {
  const key = asApiKey(
    await clerkRequest("/api_keys", {
      method: "POST",
      body: JSON.stringify({ name, subject: userId, scopes, created_by: userId }),
    }),
  );
  if (typeof key.secret !== "string") throw new Error("Clerk did not return the API key secret.");
  return { ...toManagedKey(key), secret: key.secret };
}

/** Lists only keys that were created for this MCP integration. */
export async function listMcpApiKeys(userId: string): Promise<ManagedMcpApiKey[]> {
  const query = new URLSearchParams({ subject: userId, limit: "100", include_invalid: "true" });
  const response = await clerkRequest(`/api_keys?${query}`);
  if (
    !response ||
    typeof response !== "object" ||
    !Array.isArray((response as { data?: unknown }).data)
  )
    throw new Error("Invalid Clerk API key list response.");
  return (response as { data: unknown[] }).data
    .map(asApiKey)
    .filter((key) => key.subject === userId)
    .filter((key) => key.scopes.includes("recipes:read") || key.scopes.includes("recipes:write"))
    .map(toManagedKey);
}

/** Revokes a key only after confirming that it belongs to the signed-in private owner. */
export async function revokeMcpApiKey(userId: string, apiKeyId: string): Promise<void> {
  const key = asApiKey(await clerkRequest(`/api_keys/${encodeURIComponent(apiKeyId)}`));
  if (
    key.subject !== userId ||
    (!key.scopes.includes("recipes:read") && !key.scopes.includes("recipes:write"))
  )
    throw new Error("MCP API key was not found.");
  await clerkRequest(`/api_keys/${encodeURIComponent(apiKeyId)}/revoke`, { method: "POST" });
}
