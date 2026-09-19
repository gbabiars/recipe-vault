import assert from "node:assert/strict";
import test from "node:test";
import {
  isMcpKey,
  mcpKeyAccess,
  parseMcpKeyRequest,
} from "../src/features/mcp-keys/mcp-key-policy";

test("MCP key creation accepts only supported access and expiration presets", () => {
  assert.deepEqual(parseMcpKeyRequest({ name: " Claude ", access: "read", expiration: "90" }), {
    name: "Claude",
    access: "read",
    expirationDays: 90,
  });
  assert.deepEqual(mcpKeyAccess.write, ["recipes:read", "recipes:write"]);
  assert.deepEqual(parseMcpKeyRequest({ name: "Claude", access: "admin", expiration: "90" }), {
    error: "Choose the access this key needs.",
  });
  assert.deepEqual(parseMcpKeyRequest({ name: "", access: "read", expiration: "90" }), {
    error: "Enter a name for this key.",
  });
  assert.deepEqual(parseMcpKeyRequest({ name: "Claude", access: "read", expiration: "never" }), {
    error: "Choose when this key should expire.",
  });
});

test("only Recipe Vault-scoped keys appear in MCP key management", () => {
  assert.equal(isMcpKey(["recipes:read"]), true);
  assert.equal(isMcpKey(["recipes:write"]), true);
  assert.equal(isMcpKey([]), false);
  assert.equal(isMcpKey(["other:scope"]), false);
});

test("the Clerk adapter creates, lists, and revokes only the owner's MCP keys", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalSecretKey = process.env.CLERK_SECRET_KEY;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  process.env.CLERK_SECRET_KEY = "sk_test_not_a_real_secret";
  const apiKeyJson = (overrides: Record<string, unknown> = {}) => ({
    object: "api_key",
    id: "ak_read",
    type: "api_key",
    name: "Read key",
    subject: "user_owner",
    scopes: ["recipes:read"],
    claims: null,
    revoked: false,
    revocation_reason: null,
    expired: false,
    expiration: 2,
    created_by: "user_owner",
    description: "Recipe Vault MCP compatibility key",
    last_used_at: null,
    created_at: 1,
    updated_at: 1,
    ...overrides,
  });
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.endsWith("/api_keys") && init?.method === "POST")
      return Response.json(apiKeyJson({ id: "ak_created", name: "Claude", secret: "ak_secret" }));
    if (url.includes("/api_keys?"))
      return Response.json({
        data: [
          apiKeyJson(),
          apiKeyJson({ id: "ak_unrelated", name: "Other key", scopes: ["other:scope"] }),
          apiKeyJson({ id: "ak_other_user", name: "Other user key", subject: "user_other" }),
        ],
        total_count: 3,
      });
    if (url.endsWith("/api_keys/ak_read")) return Response.json(apiKeyJson());
    if (url.endsWith("/api_keys/ak_read/revoke"))
      return Response.json(apiKeyJson({ revoked: true }));
    throw new Error(`Unexpected request: ${url}`);
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalSecretKey === undefined) delete process.env.CLERK_SECRET_KEY;
    else process.env.CLERK_SECRET_KEY = originalSecretKey;
  });

  const { createMcpApiKey, listMcpApiKeys, revokeMcpApiKey } =
    await import("../src/lib/auth/clerk-api-keys");
  const created = await createMcpApiKey("user_owner", "Claude", ["recipes:read"], 90);
  assert.equal(created.secret, "ak_secret");
  assert.deepEqual(JSON.parse(String(requests[0]?.init?.body)), {
    name: "Claude",
    subject: "user_owner",
    description: "Recipe Vault MCP compatibility key",
    scopes: ["recipes:read"],
    created_by: "user_owner",
    seconds_until_expiration: 7776000,
  });
  assert.deepEqual(await listMcpApiKeys("user_owner"), [
    {
      id: "ak_read",
      name: "Read key",
      scopes: ["recipes:read"],
      createdAt: 1,
      lastUsedAt: null,
      expiration: 2,
      revoked: false,
      expired: false,
    },
  ]);
  await revokeMcpApiKey("user_owner", "ak_read");
  assert.equal(requests.at(-1)?.url, "https://api.clerk.com/api_keys/ak_read/revoke");
});
