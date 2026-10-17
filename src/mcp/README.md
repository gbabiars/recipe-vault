# MCP boundary

The remote Streamable HTTP MCP transport, Clerk OAuth policy, and tool adapters
live here. `/mcp` uses Clerk OAuth 2.1 through `@clerk/mcp-tools` and
`mcp-handler`; it derives the user and scopes from verified Clerk authentication.

The adapter binds the verified user ID to an owner-scoped recipe service before
constructing the server-only Supabase client. OAuth tokens are never passed to
Supabase. Tool code reuses that service, enforces its required scope, and never
accepts identity claims in tool input. The verified adapter is the only MCP path
allowed to use the server-only service-role credential.

The recipe shape contains an ID, title, description, optional yield, time,
ingredients, equipment, instructions, notes, tag names, and optional source URL.
`search_recipes` and `get_recipe` require `recipes:read`; `save_recipe` and
`replace_recipe` require `recipes:write`. `save_recipe` creates a recipe;
`replace_recipe` takes a complete recipe and `expectedRevision`, and rejects
stale revisions. Yield is optional. For example:

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

For a recipe supplied as a link, uploaded document, image, or pasted content,
the consuming agent reads and extracts the source, then calls `save_recipe`.
Server instructions and the `save_recipe` description direct the agent to read
the public, read-only `get_recipe_import_guidance` tool first. Its response
contains the extraction policy shared with the in-app PDF and website importer,
plus the save field mapping. The MCP server does not fetch or extract the source:

```ts
const guidance = await get_recipe_import_guidance();
const source = await agent.read(userSuppliedSource);
const recipe = await agent.extract(source, guidance);
await save_recipe({ ...recipe, ...(sourceUrl ? { sourceUrl } : {}) });
```

The server also publishes `skill://recipe-import/SKILL.md` with `skills/list`,
`skills/get`, and `resources/read` for ChatGPT's static MCP skill import. The
skill is generated from the same extraction policy. The MCP handler serves
protocol `2026-07-28` and falls back to stateless Streamable HTTP for 2025-era
clients. The skill implementation targets ChatGPT's documented import subset;
it does not claim full `2026-07-28` Skills extension conformance. Hosts without
skill support can use the guidance tool.

The server also exposes `list_tags` and `replace_tag_name`. Listing requires
`recipes:read`; replacement requires `recipes:write`. Tag names live in each
recipe's `tags` array, and inventory counts come from the authenticated owner's
recipes. `list_tags` returns names and usage counts, with literal search, name or
usage sorting, and cursor pagination. A replacement explicitly selects
canonical source and target names; affected recipes update atomically and
duplicates collapse to one name:

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

Removing a name from its last recipe removes it from inventory. Cursors are bound
to the verified owner and normalized query options; restart the listing if the
cursor is rejected.

`search_recipes` returns structured recipe summaries. Its static
`ui://recipe-vault/search-results.html` resource renders results as read-only
cards in MCP Apps-capable hosts; other hosts retain the JSON text response. The
`get_recipe` resource at `ui://recipe-vault/recipe-view.html` renders the full
read-only recipe. Both views receive only fields needed for display: no owner,
audit, or authentication data. They do not add scopes, network access, or
app-initiated tool calls.

See [OAuth MCP setup](../../docs/mcp-oauth-setup.md) for local, Clerk, Supabase,
hosting, and verification instructions.
