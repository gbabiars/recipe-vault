import { clerkClient } from "@clerk/nextjs/server";

export type ManagedMcpApiKey = {
  id: string;
  name: string;
  scopes: string[];
  createdAt: number;
  lastUsedAt: number | null;
  expiration: number | null;
  revoked: boolean;
  expired: boolean;
};

export type CreatedMcpApiKey = ManagedMcpApiKey & { secret: string };

type ClerkApiKey = Awaited<ReturnType<Awaited<ReturnType<typeof clerkClient>>["apiKeys"]["get"]>>;

function isMcpKey(key: Pick<ClerkApiKey, "scopes">) {
  return key.scopes.includes("recipes:read") || key.scopes.includes("recipes:write");
}

function toManagedKey(key: ClerkApiKey): ManagedMcpApiKey {
  return {
    id: key.id,
    name: key.name,
    scopes: key.scopes,
    createdAt: key.createdAt,
    lastUsedAt: key.lastUsedAt,
    expiration: key.expiration,
    revoked: key.revoked,
    expired: key.expired,
  };
}

/** Creates a scoped, expiring Clerk key for an OAuth-incompatible MCP client. */
export async function createMcpApiKey(
  userId: string,
  name: string,
  scopes: string[],
  expirationDays: 30 | 90 | 365,
): Promise<CreatedMcpApiKey> {
  const clerk = await clerkClient();
  const key = await clerk.apiKeys.create({
    name,
    subject: userId,
    description: "Recipe Vault MCP compatibility key",
    scopes,
    createdBy: userId,
    secondsUntilExpiration: expirationDays * 24 * 60 * 60,
  });
  if (!key.secret) throw new Error("Clerk did not return the API key secret.");
  return { ...toManagedKey(key), secret: key.secret };
}

/** Lists only Recipe Vault MCP keys owned by the signed-in user. */
export async function listMcpApiKeys(userId: string): Promise<ManagedMcpApiKey[]> {
  const clerk = await clerkClient();
  const response = await clerk.apiKeys.list({
    subject: userId,
    limit: 100,
    includeInvalid: true,
  });
  return response.data.filter((key) => key.subject === userId && isMcpKey(key)).map(toManagedKey);
}

/** Revokes a key only after confirming it belongs to this user and integration. */
export async function revokeMcpApiKey(userId: string, apiKeyId: string): Promise<void> {
  const clerk = await clerkClient();
  const key = await clerk.apiKeys.get(apiKeyId);
  if (key.subject !== userId || !isMcpKey(key)) throw new Error("MCP API key was not found.");
  await clerk.apiKeys.revoke({
    apiKeyId,
    revocationReason: "Revoked by the Recipe Vault user",
  });
}
