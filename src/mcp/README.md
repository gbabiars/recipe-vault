# MCP boundary

The remote Streamable HTTP MCP transport, Clerk API-key policy, and tool adapters
live here. Route code verifies an opaque Clerk user API key, checks the configured
private owner and the per-tool `recipes:read`/`recipes:write` scope, then passes
only that derived owner ID and a server-only Supabase client into this boundary.
API keys are never passed to Supabase. Tool code must reuse the recipe service
layer; it must not query Supabase directly, accept identity claims as inputs, or
add capabilities.
