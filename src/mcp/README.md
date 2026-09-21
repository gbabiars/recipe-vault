# MCP boundary

The remote Streamable HTTP MCP transport, Clerk OAuth/API-key policy, and tool
adapters live here. `/mcp` uses Clerk OAuth 2.1 through `@clerk/mcp-tools` and
`mcp-handler`; `/api/mcp` accepts scoped Clerk user API keys only as a compatibility
path. Both derive the user and scopes from verified Clerk authentication.

The adapter binds the verified user ID to an owner-scoped recipe service before
constructing the server-only Supabase client. OAuth tokens and API keys are never
passed to Supabase. Tool code must reuse that service, enforce its required scope,
and never accept identity claims in tool input.

`get_recipe` is display-only MCP Apps-enhanced. Models should first call
`search_recipes`, then pass one returned ID to `get_recipe`; its static
`ui://recipe-vault/recipe-view.html` resource renders the full read-only recipe
in MCP Apps-capable hosts. The tool retains its existing JSON text response for
other hosts and ambiguous or empty searches remain text-only clarification
flows. The renderer receives a display projection only: never owner, audit, or
authentication data. It does not add scopes, browser access, database access,
or app-initiated tool calls.
