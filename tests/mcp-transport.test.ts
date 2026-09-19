import assert from "node:assert/strict";
import test from "node:test";
import { authorizeMcpTool, mcpPrincipal, mcpScopes } from "../src/mcp/auth-policy";
import { handleMcpRequest } from "../src/mcp/server";

const resourceServer = "https://recipes.example.test/api/mcp";

test("MCP principal derives its user and enforces exact tool scopes", () => {
  const base = {
    token: "redacted",
    clientId: "client",
    scopes: ["recipes:read"],
    extra: { userId: "user_owner", credentialType: "oauth" },
  };
  assert.equal(mcpPrincipal(base)?.userId, "user_owner");
  assert.equal(authorizeMcpTool(base, mcpScopes.read)?.userId, "user_owner");
  assert.equal(authorizeMcpTool(base, mcpScopes.write), null);
  assert.equal(
    authorizeMcpTool({ ...base, scopes: ["recipes:write"] }, mcpScopes.write)?.userId,
    "user_owner",
  );
  assert.equal(mcpPrincipal({ ...base, extra: { userId: "user_owner" } }), null);
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
