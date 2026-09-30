# MCP boundary

The remote Streamable HTTP MCP transport, Clerk OAuth policy, and tool adapters
live here. `/mcp` uses Clerk OAuth 2.1 through `@clerk/mcp-tools` and
`mcp-handler`; it derives the user and scopes from verified Clerk authentication.

The adapter binds the verified user ID to an owner-scoped recipe service before
constructing the server-only Supabase client. OAuth tokens are never passed to
Supabase. Tool code must reuse that service, enforce its required scope, and
never accept identity claims in tool input.

The server exposes `list_tags`, `delete_unused_tag`, `merge_tags`,
`search_recipes`, `get_recipe`, and create-only `save_recipe`. Read tools require
`recipes:read`; tag maintenance and save require `recipes:write`.

`list_tags` returns owned tag IDs and names with exact counts of associated
recipes. It supports literal case-insensitive substring search, `all`,
`used`, or `unused` filtering, deterministic name or usage-count ordering,
and live cursor pagination. For example, an agent can find popular tags with
`{ "usage": "used", "sort": "usage_desc", "limit": 20 }` or inspect
cleanup candidates with `{ "usage": "unused" }`. The opaque cursor is bound
to the owner and normalized query options; refresh the listing before acting on
results because counts are live.

`delete_unused_tag` removes one selected tag by stable ID. First list cleanup
candidates, then pass the chosen ID, for example:

```ts
const { tags } = await list_tags({ usage: "unused" });
if (tags[0]) await delete_unused_tag({ tagId: tags[0].id });
```

The database rechecks ownership and zero associations while holding a lock that
serializes against recipe-tag association writes. If the tag is in use, missing,
or belongs to another owner, the response does not distinguish those cases.
This slice deletes only one tag per call; consolidation and bulk cleanup remain
out of scope. Tag deletion is not added to recipe audit events because the
existing audit contract requires a recipe target.

`merge_tags` consolidates two explicitly selected IDs. List tags first, let the
user or agent choose which source should disappear and which target should stay,
then pass those stable IDs:

```ts
await merge_tags({ sourceTagId: source.id, targetTagId: target.id });
```

The source's recipe associations move to the target; recipes that already have
both keep one target association, and the source tag is removed. Source and
target must be distinct tags still owned by the authenticated user. Missing,
unowned, or identical IDs receive one generic refusal, so the operation cannot
enumerate another owner's tags. The database locks both tag rows in UUID order,
waits for in-flight association writes, then transfers links atomically. Existing
association triggers maintain each affected recipe's compatibility projection;
recipe fields and ingredients are not changed. Similar names are not matched,
and tags are not renamed.

`get_recipe` is display-only MCP Apps-enhanced. Models should first call
`search_recipes`, then pass one returned ID to `get_recipe`; its static
`ui://recipe-vault/recipe-view.html` resource renders the full read-only recipe
in MCP Apps-capable hosts. The tool retains its existing JSON text response for
other hosts and ambiguous or empty searches remain text-only clarification
flows. The renderer receives a display projection only: never owner, audit, or
authentication data. It does not add scopes, browser access, database access,
or app-initiated tool calls.

`save_recipe` follows the shared ingredient contract. For example:

```ts
await save_recipe({
  title: "Lemon pasta",
  ingredients: [
    { displayOrder: 1, amount: "200 g", ingredientName: "spaghetti" },
    { displayOrder: 2, amount: "to taste", ingredientName: "salt" },
  ],
  steps: [{ stepOrder: 1, instruction: "Cook the pasta." }],
});
```

`amount` is optional free text. `get_recipe` returns it when present and omits it
when the ingredient has no amount.
