# MCP boundary

The remote Streamable HTTP MCP transport, OAuth adapter, and tool adapters live
here. Route code authenticates a request with Supabase OAuth and passes only a
verified user-scoped Supabase client into this boundary. Tool code must reuse
the recipe service layer; it must not query Supabase directly, accept identity
claims as inputs, add capabilities, or use a privileged client.
