import assert from "node:assert/strict";
import test from "node:test";
import { createMcpApiKey, listMcpApiKeys, revokeMcpApiKey } from "../src/lib/auth/clerk-api-keys";
import {
  isMcpKey,
  mcpKeyAccess,
  parseMcpKeyRequest,
} from "../src/features/mcp-keys/mcp-key-policy";

test("MCP key creation accepts only the supported access presets", () => {
  assert.deepEqual(parseMcpKeyRequest({ name: " Claude ", access: "read" }), {
    name: "Claude",
    access: "read",
  });
  assert.deepEqual(mcpKeyAccess.write, ["recipes:read", "recipes:write"]);
  assert.deepEqual(parseMcpKeyRequest({ name: "Claude", access: "admin" }), {
    error: "Choose the access this key needs.",
  });
  assert.deepEqual(parseMcpKeyRequest({ name: "", access: "read" }), {
    error: "Enter a name for this key.",
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
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.endsWith("/api_keys") && init?.method === "POST")
      return Response.json({
        id: "ak_created",
        name: "Claude",
        subject: "user_owner",
        scopes: ["recipes:read"],
        secret: "ak_secret",
        created_at: 1,
      });
    if (url.includes("/api_keys?"))
      return Response.json({
        data: [
          {
            id: "ak_read",
            name: "Read key",
            subject: "user_owner",
            scopes: ["recipes:read"],
          },
          {
            id: "ak_unrelated",
            name: "Other key",
            subject: "user_owner",
            scopes: ["other:scope"],
          },
          {
            id: "ak_other_user",
            name: "Other user key",
            subject: "user_other",
            scopes: ["recipes:read"],
          },
        ],
      });
    if (url.endsWith("/api_keys/ak_read"))
      return Response.json({
        id: "ak_read",
        name: "Read key",
        subject: "user_owner",
        scopes: ["recipes:read"],
      });
    if (url.endsWith("/api_keys/ak_read/revoke")) return Response.json({});
    throw new Error(`Unexpected request: ${url}`);
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalSecretKey === undefined) delete process.env.CLERK_SECRET_KEY;
    else process.env.CLERK_SECRET_KEY = originalSecretKey;
  });

  const created = await createMcpApiKey("user_owner", "Claude", ["recipes:read"]);
  assert.equal(created.secret, "ak_secret");
  assert.deepEqual(JSON.parse(String(requests[0]?.init?.body)), {
    name: "Claude",
    subject: "user_owner",
    scopes: ["recipes:read"],
    created_by: "user_owner",
  });
  assert.deepEqual(await listMcpApiKeys("user_owner"), [
    {
      id: "ak_read",
      name: "Read key",
      scopes: ["recipes:read"],
      createdAt: null,
      lastUsedAt: null,
      revoked: false,
      expired: false,
    },
  ]);
  await revokeMcpApiKey("user_owner", "ak_read");
  assert.equal(requests.at(-1)?.url, "https://api.clerk.com/v1/api_keys/ak_read/revoke");
});
