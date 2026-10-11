# MCP boundary

The remote Streamable HTTP MCP transport, Clerk OAuth policy, and tool adapters
live here. `/mcp` uses Clerk OAuth 2.1 through `@clerk/mcp-tools` and
`mcp-handler`; it derives the user and scopes from verified Clerk authentication.

The adapter binds the verified user ID to an owner-scoped recipe service before
constructing the server-only Supabase client. OAuth tokens are never passed to
Supabase. Tool code must reuse that service, enforce its required scope, and
never accept identity claims in tool input. The verified adapter is the only
MCP path allowed to use the server-only service-role credential.

The recipe tools are `search_recipes`, `get_recipe`, `save_recipe`, and
`replace_recipe`. `search_recipes` and `get_recipe` require `recipes:read`;
create and replacement require `recipes:write`. They use the full validated
recipe document. `save_recipe` creates one; `replace_recipe` takes a full
document and `expectedRevision`, and rejects stale revisions. Yield is optional.
For example:

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

The server also exposes `list_tags` and `replace_tag_name`. Listing requires
`recipes:read`; replacement requires `recipes:write`. Tag names live in recipe
document `tags` arrays, and inventory counts are derived from the authenticated
owner's recipes. `list_tags` returns names and usage counts, with literal search,
name or usage sorting, and cursor pagination. A replacement explicitly selects
canonical source and target names; affected documents are updated atomically and
duplicates collapse to one target name:

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

The target model has no tag IDs, descriptions, unused tags, or separate tag
table. Removing a name from the last recipe removes it from inventory. Cursors
are bound to the verified owner and normalized query options; restart the listing
if the cursor is rejected.

`search_recipes` also returns a structured recipe summary array. Its static
`ui://recipe-vault/search-results.html` resource renders results as read-only
cards in MCP Apps-capable hosts; other hosts retain the JSON text response. The
`get_recipe` resource at `ui://recipe-vault/recipe-view.html` renders the full
read-only document. Both views receive only fields needed for display: no owner,
audit, or authentication data. They do not add scopes, network access, or
app-initiated tool calls.

See [OAuth MCP setup](../../docs/mcp-oauth-setup.md) for local, Clerk, Supabase,
hosting, and verification instructions. The
[recipe document cutover runbook](../../docs/recipe-document-cutover-runbook.md)
describes the coordinated contract rollout and rollback boundary.
