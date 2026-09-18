import assert from "node:assert/strict";
import test from "node:test";
import { authorizesMcpApiKey, requiredMcpScope } from "../src/mcp/auth-policy";
import { handleMcpRequest } from "../src/mcp/server";

const resourceServer = "https://recipes.example.test/api/mcp";

test("MCP API-key policy requires the private owner and exact tool scope", () => {
  const base = {
    isAuthenticated: true,
    tokenType: "api_key",
    subject: "user_owner",
    scopes: ["recipes:read"],
  };
  assert.equal(authorizesMcpApiKey(base, "user_owner", "recipes:read"), true);
  assert.equal(
    authorizesMcpApiKey({ ...base, subject: "user_other" }, "user_owner", "recipes:read"),
    false,
  );
  assert.equal(authorizesMcpApiKey(base, "user_owner", "recipes:write"), false);
  assert.equal(
    authorizesMcpApiKey({ ...base, scopes: ["recipes:write"] }, "user_owner", "recipes:write"),
    true,
  );
  assert.equal(
    authorizesMcpApiKey({ ...base, tokenType: "session_token" }, "user_owner", "recipes:read"),
    false,
  );
  assert.equal(
    requiredMcpScope({ method: "tools/call", params: { name: "search_recipes" } }),
    "recipes:read",
  );
  assert.equal(
    requiredMcpScope({ method: "tools/call", params: { name: "save_recipe" } }),
    "recipes:write",
  );
  assert.equal(requiredMcpScope({ method: "initialize" }), null);
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
