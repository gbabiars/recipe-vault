import assert from "node:assert/strict";
import test from "node:test";
import { authorizeMcpTool, mcpPrincipal, mcpScopes } from "../src/mcp/auth-policy";
import { handleMcpRequest } from "../src/mcp/server";

const resourceServer = "https://recipes.example.test/mcp";
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
  assert.deepEqual(names, [
    "list_tags",
    "delete_unused_tag",
    "merge_tags",
    "search_recipes",
    "get_recipe",
    "save_recipe",
  ]);

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
  const listTags = listedTools.result.tools.find(
    (tool: { name: string }) => tool.name === "list_tags",
  );
  const deleteUnusedTag = listedTools.result.tools.find(
    (tool: { name: string }) => tool.name === "delete_unused_tag",
  );
  const mergeTags = listedTools.result.tools.find(
    (tool: { name: string }) => tool.name === "merge_tags",
  );
  assert.equal(listTags.title, "List tags");
  assert.match(listTags.description, /exact recipe usage counts/u);
  assert.deepEqual(listTags.annotations, { readOnlyHint: true });
  assert.deepEqual(Object.keys(listTags.inputSchema.properties).sort(), [
    "cursor",
    "limit",
    "search",
    "sort",
    "usage",
  ]);
  assert.deepEqual(listTags.inputSchema.properties.usage.enum, ["all", "used", "unused"]);
  assert.deepEqual(listTags.inputSchema.properties.sort.enum, [
    "name_asc",
    "usage_desc",
    "usage_asc",
  ]);
  assert.equal(listTags.inputSchema.properties.limit.maximum, 100);
  assert.equal(deleteUnusedTag.title, "Delete unused tag");
  assert.match(deleteUnusedTag.description, /only if it has no recipe associations/u);
  assert.deepEqual(deleteUnusedTag.annotations, {
    readOnlyHint: false,
    idempotentHint: true,
    destructiveHint: true,
  });
  assert.deepEqual(Object.keys(deleteUnusedTag.inputSchema.properties), ["tagId"]);
  assert.equal(deleteUnusedTag.inputSchema.properties.tagId.format, "uuid");
  assert.equal(mergeTags.title, "Merge tags");
  assert.match(mergeTags.description, /explicitly selected source tag/u);
  assert.match(mergeTags.description, /does not guess similar names/u);
  assert.deepEqual(mergeTags.annotations, {
    readOnlyHint: false,
    idempotentHint: true,
    destructiveHint: true,
  });
  assert.deepEqual(Object.keys(mergeTags.inputSchema.properties).sort(), [
    "sourceTagId",
    "targetTagId",
  ]);
  assert.equal(mergeTags.inputSchema.properties.sourceTagId.format, "uuid");
  assert.equal(mergeTags.inputSchema.properties.targetTagId.format, "uuid");
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

test("list_tags transport binds the verified owner and returns exact counts", async () => {
  const userId = "00000000-0000-4000-8000-000000000001";
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const response = await handleMcpRequest(
    {
      rpc: async (name: string, args: Record<string, unknown>) => {
        calls.push({ name, args });
        return {
          data: [
            {
              id: "00000000-0000-4000-8000-000000000004",
              name: "dinner",
              usage_count: 3,
            },
          ],
          error: null,
        };
      },
    } as never,
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
        id: 9,
        method: "tools/call",
        params: { name: "list_tags", arguments: { usage: "used", sort: "usage_desc" } },
      }),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(calls, [
    {
      name: "recipe_vault_list_tag_inventory",
      args: {
        target_owner_id: userId,
        target_search: null,
        target_usage: "used",
        target_sort: "usage_desc",
        after_usage_count: null,
        after_name: null,
        after_tag_id: null,
        target_limit: 51,
      },
    },
  ]);
  assert.deepEqual(JSON.parse(body.result.content[0].text), {
    tags: [{ id: "00000000-0000-4000-8000-000000000004", name: "dinner", usageCount: 3 }],
  });
  assert.equal(JSON.stringify(body.result).includes(userId), false);
});

test("delete_unused_tag transport binds the verified owner and passes one tag ID", async () => {
  const userId = "00000000-0000-4000-8000-000000000001";
  const tagId = "00000000-0000-4000-8000-000000000004";
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const response = await handleMcpRequest(
    {
      rpc: async (name: string, args: Record<string, unknown>) => {
        calls.push({ name, args });
        return { data: true, error: null };
      },
    } as never,
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
        id: 10,
        method: "tools/call",
        params: { name: "delete_unused_tag", arguments: { tagId } },
      }),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(calls, [
    {
      name: "recipe_vault_delete_unused_tag",
      args: { target_owner_id: userId, target_tag_id: tagId },
    },
  ]);
  assert.deepEqual(JSON.parse(body.result.content[0].text), { deleted: true, tagId });
  assert.equal(JSON.stringify(body.result).includes(userId), false);
});

test("merge_tags transport binds verified owner and passes only the selected IDs", async () => {
  const userId = "00000000-0000-4000-8000-000000000001";
  const sourceTagId = "00000000-0000-4000-8000-000000000004";
  const targetTagId = "00000000-0000-4000-8000-000000000005";
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const response = await handleMcpRequest(
    {
      rpc: async (name: string, args: Record<string, unknown>) => {
        calls.push({ name, args });
        return { data: true, error: null };
      },
    } as never,
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
        id: 11,
        method: "tools/call",
        params: { name: "merge_tags", arguments: { sourceTagId, targetTagId } },
      }),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(calls, [
    {
      name: "recipe_vault_merge_tags",
      args: {
        target_owner_id: userId,
        source_tag_id: sourceTagId,
        target_tag_id: targetTagId,
      },
    },
  ]);
  assert.deepEqual(JSON.parse(body.result.content[0].text), {
    merged: true,
    sourceTagId,
    targetTagId,
  });
  assert.equal(JSON.stringify(body.result).includes(userId), false);
});
