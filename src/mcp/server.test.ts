import assert from "node:assert/strict";
import test from "node:test";
import { withMcpAuth } from "mcp-handler";
import { createRecipeMcpHandler, handleMcpRequest } from "./server";

const endpoint = "https://recipes.example.test/mcp";
const userId = "00000000-0000-4000-8000-000000000001";
function request(id: number, method: string, params: unknown, token?: string) {
  return new Request(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": "2025-11-25",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
}

async function handlerResult(response: Response) {
  const body = await response.text();
  if (!response.headers.get("content-type")?.startsWith("text/event-stream"))
    return JSON.parse(body).result;
  const data = body.split("\n").find((line) => line.startsWith("data: "));
  assert.ok(data, "MCP response should contain an SSE data event");
  return JSON.parse(data.slice(6)).result;
}

test("production MCP auth wrapper forwards verified owner and scopes", async () => {
  const owners: string[] = [];
  const handler = createRecipeMcpHandler(
    () => {
      throw new Error("Recipe service should not be used.");
    },
    (ownerId) => {
      owners.push(ownerId);
      return {
        listFromRecipes: async () => ({ tags: [], hasMore: false }),
      } as never;
    },
  );
  const authenticated = withMcpAuth(
    handler,
    async (_, token) =>
      token === "verified-token"
        ? {
            token,
            clientId: "verified-client",
            scopes: ["recipes:read"],
            extra: { userId, credentialType: "oauth" },
          }
        : undefined,
    { required: true, resourceMetadataPath: "/.well-known/oauth-protected-resource/mcp" },
  );

  const anonymous = await authenticated(
    request(20, "tools/call", {
      name: "list_tags",
      arguments: {},
    }),
  );
  assert.equal(anonymous.status, 401);
  assert.deepEqual(owners, []);

  const allowed = await authenticated(
    request(21, "tools/call", { name: "list_tags", arguments: {} }, "verified-token"),
  );
  assert.equal(allowed.status, 200);
  assert.deepEqual(JSON.parse((await handlerResult(allowed)).content[0].text), { tags: [] });
  assert.deepEqual(owners, [userId]);

  const denied = await authenticated(
    request(
      22,
      "tools/call",
      { name: "replace_tag_name", arguments: { sourceName: "a", targetName: "b" } },
      "verified-token",
    ),
  );
  assert.equal((await handlerResult(denied)).isError, true);
  assert.deepEqual(owners, [userId]);
});

test("production MCP handler serves the 2026 protocol discovery request", async () => {
  const handler = createRecipeMcpHandler();
  const response = await handler(
    new Request(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2026-07-28",
        "mcp-method": "server/discover",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 23,
        method: "server/discover",
        params: {
          _meta: {
            "io.modelcontextprotocol/protocolVersion": "2026-07-28",
            "io.modelcontextprotocol/clientCapabilities": {},
          },
        },
      }),
    }),
  );
  assert.equal(response.status, 200, await response.clone().text());
  const result = await handlerResult(response);
  assert.equal(result._meta["io.modelcontextprotocol/serverInfo"].name, "recipe-vault");
});
async function invoke(
  client: unknown,
  id: number,
  method: string,
  params: unknown,
  scopes?: string[],
) {
  return handleMcpRequest(client as never, userId, request(id, method, params), scopes);
}

test("MCP publishes the document recipe and derived tag contracts", async () => {
  const response = await invoke({} as never, 1, "tools/list", {});
  const { tools } = (await response.json()).result;
  assert.deepEqual(
    tools.map((tool: { name: string }) => tool.name),
    [
      "get_recipe_import_guidance",
      "list_tags",
      "replace_tag_name",
      "search_recipes",
      "get_recipe",
      "replace_recipe",
      "save_recipe",
    ],
  );
  const listTags = tools.find((tool: { name: string }) => tool.name === "list_tags");
  assert.deepEqual(Object.keys(listTags.inputSchema.properties).sort(), [
    "cursor",
    "limit",
    "search",
    "sort",
  ]);
  assert.equal("usage" in listTags.inputSchema.properties, false);
  const replaceTag = tools.find((tool: { name: string }) => tool.name === "replace_tag_name");
  assert.deepEqual(Object.keys(replaceTag.inputSchema.properties).sort(), [
    "sourceName",
    "targetName",
  ]);
  const save = tools.find((tool: { name: string }) => tool.name === "save_recipe");
  assert.equal(save.inputSchema.required.includes("yield"), false);
  assert.ok(save.inputSchema.properties.equipment);
  assert.ok(save.inputSchema.properties.notes);
  const search = tools.find((tool: { name: string }) => tool.name === "search_recipes");
  assert.ok(search.outputSchema.properties.recipes.items.properties.description);
  assert.ok(search.outputSchema.properties.recipes.items.properties.revision);
});

test("MCP publishes the recipe import skill through custom methods and a resource", async () => {
  const listed = await invoke({} as never, 10, "skills/list", {});
  const listResult = (await listed.json()).result;
  assert.equal(listResult.resultType, "complete");
  assert.equal(listResult.skills.length, 1);
  const uri = listResult.skills[0].uri;
  assert.equal(uri, "skill://recipe-import/SKILL.md");

  const fetched = await invoke({} as never, 11, "skills/get", { uri });
  const getResult = (await fetched.json()).result;
  assert.deepEqual(getResult.skill, listResult.skills[0]);

  const resource = await invoke({} as never, 12, "resources/read", { uri });
  assert.match((await resource.json()).result.contents[0].text, /get_recipe_import_guidance/);

  const nextPage = await invoke({} as never, 13, "skills/list", { cursor: "next" });
  assert.deepEqual((await nextPage.json()).result.skills, []);

  const noParams = await invoke({} as never, 14, "skills/list", undefined);
  assert.equal((await noParams.json()).result.skills.length, 1);
});

test("scope denial covers every registered read and write tool", async () => {
  let rpcCalls = 0;
  const client = {
    rpc: async () => {
      rpcCalls += 1;
      return { data: [], error: null };
    },
  };
  const id = "00000000-0000-4000-8000-000000000001";
  const recipe = {
    id,
    title: "Soup",
    description: "",
    time: {},
    ingredients: [{ name: "water" }],
    equipment: [],
    instructions: ["Boil."],
    notes: [],
    tags: [],
  };
  const calls = [
    { name: "list_tags", arguments: {}, scopes: [] },
    { name: "search_recipes", arguments: {}, scopes: [] },
    { name: "get_recipe", arguments: { recipeId: id }, scopes: [] },
    {
      name: "replace_tag_name",
      arguments: { sourceName: "dinner", targetName: "weeknight" },
      scopes: ["recipes:read"],
    },
    {
      name: "replace_recipe",
      arguments: { recipe, expectedRevision: 1 },
      scopes: ["recipes:read"],
    },
    { name: "save_recipe", arguments: { ...recipe, id: undefined }, scopes: ["recipes:read"] },
  ];
  for (const [index, call] of calls.entries()) {
    const response = await invoke(
      client,
      index + 2,
      "tools/call",
      { name: call.name, arguments: call.arguments },
      call.scopes,
    );
    assert.equal((await response.json()).result.isError, true, `${call.name} should be denied`);
  }
  assert.equal(rpcCalls, 0);
});

test("tag MCP adapter binds verified owner and accepts only canonical names", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const client = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      if (name === "recipe_vault_list_document_tag_inventory")
        return { data: [{ name: "dinner", usage_count: 3 }], error: null };
      return { data: [{ status: "replaced", changed_recipes: 2 }], error: null };
    },
  };
  const listed = await invoke(client, 4, "tools/call", {
    name: "list_tags",
    arguments: { sort: "usage_desc" },
  });
  assert.deepEqual(JSON.parse((await listed.json()).result.content[0].text), {
    tags: [{ name: "dinner", usageCount: 3 }],
  });
  const replaced = await invoke(client, 5, "tools/call", {
    name: "replace_tag_name",
    arguments: { sourceName: "weeknight", targetName: "dinner" },
  });
  assert.deepEqual(JSON.parse((await replaced.json()).result.content[0].text), {
    replaced: true,
    sourceName: "weeknight",
    targetName: "dinner",
    changedRecipes: 2,
  });
  assert.deepEqual(calls, [
    {
      name: "recipe_vault_list_document_tag_inventory",
      args: {
        target_owner_id: userId,
        target_search: null,
        target_sort: "usage_desc",
        after_usage_count: null,
        after_name: null,
        before_usage_count: null,
        before_name: null,
        target_limit: 51,
      },
    },
    {
      name: "recipe_vault_replace_document_tag",
      args: { target_owner_id: userId, source_name: "weeknight", target_name: "dinner" },
    },
  ]);
  assert.equal(JSON.stringify(calls).includes("attacker"), false);
});
