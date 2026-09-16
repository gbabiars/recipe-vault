import assert from "node:assert/strict";
import test from "node:test";
import { withOAuthProtectedResource } from "@supabase/server/oauth-protected-resource";
import { acceptsMcpOAuthClaims } from "../src/mcp/auth-policy";
import { handleMcpRequest } from "../src/mcp/server";

const resourceServer = "https://recipes.example.test/api/mcp";
const authorizationServer = "https://project.example.supabase.co/auth/v1";

test("MCP claim policy requires the Supabase issuer, authenticated audience, and trusted client", () => {
  const base = { iss: authorizationServer, aud: "authenticated", client_id: "trusted" };
  assert.equal(acceptsMcpOAuthClaims(base, "https://project.example.supabase.co", "trusted"), true);
  assert.equal(
    acceptsMcpOAuthClaims(
      { ...base, iss: "https://attacker.test" },
      "https://project.example.supabase.co",
      "trusted",
    ),
    false,
  );
  assert.equal(
    acceptsMcpOAuthClaims(
      { ...base, aud: "other" },
      "https://project.example.supabase.co",
      "trusted",
    ),
    false,
  );
  assert.equal(
    acceptsMcpOAuthClaims(
      { ...base, client_id: "other" },
      "https://project.example.supabase.co",
      "trusted",
    ),
    false,
  );
});

test("protected-resource discovery publishes metadata and enriches unauthenticated responses", async () => {
  const handler = withOAuthProtectedResource(
    { resourceServer, authorizationServer },
    async () =>
      new Response(JSON.stringify({ error: "Authentication required." }), { status: 401 }),
  );
  const metadata = await handler(new Request(`${resourceServer}/oauth-protected-resource`));
  assert.equal(metadata.status, 200);
  assert.deepEqual(await metadata.json(), {
    resource: resourceServer,
    authorization_servers: [authorizationServer],
    bearer_methods_supported: ["header"],
  });
  const unauthorized = await handler(new Request(resourceServer, { method: "POST" }));
  assert.equal(unauthorized.status, 401);
  assert.match(unauthorized.headers.get("www-authenticate") ?? "", /resource_metadata=/);
});

test("stateless Streamable HTTP initializes and exposes only Recipe Vault tools", async () => {
  const userId = "00000000-0000-4000-8000-000000000001";
  const initialize = await handleMcpRequest(
    {} as never,
    userId,
    new Request(resourceServer, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "test", version: "1" },
        },
      }),
    }),
  );
  assert.equal(initialize.status, 200);
  assert.equal((await initialize.json()).result.serverInfo.name, "recipe-vault");

  const tools = await handleMcpRequest(
    {} as never,
    userId,
    new Request(resourceServer, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-11-25",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
    }),
  );
  assert.equal(tools.status, 200);
  const names = (await tools.json()).result.tools.map((tool: { name: string }) => tool.name);
  assert.deepEqual(names, ["search_recipes", "get_recipe", "save_recipe"]);
});
