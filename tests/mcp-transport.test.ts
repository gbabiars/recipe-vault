import assert from "node:assert/strict";
import test from "node:test";
import { authorizeMcpTool, mcpPrincipal, mcpScopes } from "../src/mcp/auth-policy";
import { handleMcpRequest } from "../src/mcp/server";

const resourceServer = "https://recipes.example.test/api/mcp";
const recipeViewUri = "ui://recipe-vault/recipe-view.html";

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

  const listedTools = await (
    await handleMcpRequest(
      {} as never,
      userId,
      new Request(resourceServer, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          "mcp-protocol-version": "2025-11-25",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/list", params: {} }),
      }),
    )
  ).json();
  const getRecipe = listedTools.result.tools.find(
    (tool: { name: string }) => tool.name === "get_recipe",
  );
  assert.deepEqual(getRecipe._meta, {
    ui: { resourceUri: recipeViewUri, visibility: ["model"] },
    "ui/resourceUri": recipeViewUri,
  });
  for (const tool of listedTools.result.tools.filter(
    (tool: { name: string }) => tool.name !== "get_recipe",
  )) {
    assert.equal(tool._meta, undefined);
  }

  const resources = await handleMcpRequest(
    {} as never,
    userId,
    new Request(resourceServer, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-11-25",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 4, method: "resources/list", params: {} }),
    }),
  );
  const listedResources = await resources.json();
  assert.deepEqual(listedResources.result.resources, [
    {
      uri: recipeViewUri,
      name: "Recipe view",
      mimeType: "text/html;profile=mcp-app",
      _meta: { ui: { prefersBorder: true } },
    },
  ]);

  const resource = await handleMcpRequest(
    {} as never,
    userId,
    new Request(resourceServer, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-11-25",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 5,
        method: "resources/read",
        params: { uri: recipeViewUri },
      }),
    }),
  );
  const readResource = await resource.json();
  assert.equal(readResource.result.contents[0].uri, recipeViewUri);
  assert.equal(readResource.result.contents[0].mimeType, "text/html;profile=mcp-app");
  assert.equal(readResource.result.contents[0]._meta.ui.prefersBorder, true);
  assert.match(readResource.result.contents[0].text, /^<!doctype html>/iu);
  assert.equal(readResource.result.contents[0].text.includes('src="/assets/'), false);
  assert.equal(readResource.result.contents[0].text.includes('href="/assets/'), false);
});
