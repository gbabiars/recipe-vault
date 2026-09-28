# MCP boundary

The remote Streamable HTTP MCP transport, Clerk OAuth policy, and tool adapters
live here. `/mcp` uses Clerk OAuth 2.1 through `@clerk/mcp-tools` and
`mcp-handler`; it derives the user and scopes from verified Clerk authentication.

The adapter binds the verified user ID to an owner-scoped recipe service before
constructing the server-only Supabase client. OAuth tokens are never passed to
Supabase. Tool code must reuse that service, enforce its required scope, and
never accept identity claims in tool input.

The server exposes `list_tags`, `search_recipes`, `get_recipe`, and
create-only `save_recipe`. Read tools require `recipes:read`; save requires
`recipes:write`.

`list_tags` returns owned tag IDs and names with exact counts of associated
recipes. It supports literal case-insensitive substring search, `all`,
`used`, or `unused` filtering, deterministic name or usage-count ordering,
and live cursor pagination. For example, an agent can find popular tags with
`{ "usage": "used", "sort": "usage_desc", "limit": 20 }` or inspect
cleanup candidates with `{ "usage": "unused" }`. The opaque cursor is bound
to the owner and normalized query options; refresh the listing before acting on
results because counts are live.

`get_recipe` is display-only MCP Apps-enhanced. Models should first call
`search_recipes`, then pass one returned ID to `get_recipe`; its static
`ui://recipe-vault/recipe-view.html` resource renders the full read-only recipe
in MCP Apps-capable hosts. The tool retains its existing JSON text response for
other hosts and ambiguous or empty searches remain text-only clarification
flows. The renderer receives a display projection only: never owner, audit, or
authentication data. It does not add scopes, browser access, database access,
or app-initiated tool calls.
