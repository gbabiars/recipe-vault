# MCP contracts

Recipe Vault exposes a remote Streamable HTTP MCP endpoint at `/mcp`. It uses
Clerk OAuth 2.1 through `@clerk/mcp-tools` and `mcp-handler`, with PKCE,
consent, automatic client onboarding (CIMD for compatible clients, DCR for broad
compatibility), and metadata endpoints at
`/.well-known/oauth-protected-resource/mcp` and
`/.well-known/oauth-authorization-server`. OAuth verification and owner/scope
requirements are in the [security standard](../standards/security-and-ownership.md).
For setup, see the [MCP OAuth guide](../guides/mcp-oauth-setup.md).

The tools are `list_tags`, `replace_tag_name`, `search_recipes`, `get_recipe`,
`save_recipe`, `replace_recipe`, and the public, read-only
`get_recipe_import_guidance`. Recipe and tag read tools require
`recipes:read`; mutations require `recipes:write`. The guidance tool does not
require a recipe scope. `save_recipe` creates a recipe and
`replace_recipe` takes a complete recipe plus `expectedRevision`, rejecting a
stale revision. The shared [recipe shape](recipes.md#recipe-shape-and-writes)
applies and yield remains optional.

```ts
const { recipes } = await search_recipes({ query: "tomato", limit: 10 });
const selected = recipes[0];
if (selected) {
  const current = await get_recipe({ recipeId: selected.id });
  await replace_recipe({
    recipe: { ...current.recipe, title: "Roasted tomato pasta" },
    expectedRevision: current.revision,
  });
}
```

For a link, document, image, or pasted source, the consuming agent reads and
extracts the source, then calls `save_recipe`. Server instructions and the
tool description direct the agent to call `get_recipe_import_guidance` first.
It returns the extraction policy shared with the app importer and the save
field mapping. The MCP server does not fetch or extract that source itself.

```ts
const guidance = await get_recipe_import_guidance();
const source = await agent.read(userSuppliedSource);
const recipe = await agent.extract(source, guidance);
await save_recipe({ ...recipe, ...(sourceUrl ? { sourceUrl } : {}) });
```

`list_tags` returns canonical names and exact usage counts with literal
search, name or usage sorting, and cursor pagination. `replace_tag_name`
atomically replaces selected source and target names across the owner's
recipes, collapsing duplicates. Removing a name from its last recipe removes
it from inventory. Cursors bind to the verified owner and normalized query
options; restart a listing if its cursor is rejected.

```ts
const { tags } = await list_tags({ search: "weeknight", limit: 20 });
const source = tags.find((tag) => tag.name === "weeknight dinners");
if (source) {
  await replace_tag_name({
    sourceName: source.name,
    targetName: "weeknight",
  });
}
```

`search_recipes` returns structured summaries. Its static
`ui://recipe-vault/search-results.html` resource renders read-only cards in
MCP Apps-capable hosts, while other hosts retain the JSON text response.
`get_recipe` exposes a full read-only view at
`ui://recipe-vault/recipe-view.html` with the same fallback. Both receive
only recipe fields needed for display, without owner, audit, or
authentication data. They add no scopes, external network access, or
app-initiated tool calls.

The server publishes `skill://recipe-import/SKILL.md` through `skills/list`,
`skills/get`, and `resources/read` for ChatGPT's static MCP skill import. The
skill is generated from the same extraction policy. The handler serves
protocol `2026-07-28` and falls back to stateless Streamable HTTP for
2025-era clients. The skill targets ChatGPT's documented import subset; it
does not claim full `2026-07-28` Skills extension conformance. Hosts without
skill support can use the guidance tool.

The private [Recipe Vault plugin](../../plugins/recipe-vault/README.md)
packages the recipe import skill for local distribution and connects to a
separately configured Recipe Vault MCP endpoint.
