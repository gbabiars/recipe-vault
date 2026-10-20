# Code organization standard

Keep route components and route handlers in `src/app` thin. Validate external
inputs before invoking domain services. Collocate recipe and tag UI with the
private routes that use it under `src/app/(private)/recipes` and
`src/app/(private)/tags`. Put UI shared by several recipe pages at their nearest
common route parent.

Put recipe-domain services, transformations, import policy, and authorization
rules in `src/lib/recipes`. Put database repositories and Supabase access
adapters in `src/lib/db`; features must use those repositories rather than
query Supabase directly. Put shared validation schemas and tag normalization in
`src/lib/validation`, and Clerk identity and Supabase client setup in
`src/lib/auth`.

Keep the remote MCP transport, Clerk OAuth policy, and tool adapters in
`src/mcp`. MCP tools reuse recipe-domain ownership rules. Their access
requirements are in the [security standard](security-and-ownership.md).

Keep generic design-system primitives in `src/components/ui`. Put a
presentational component in `src/components/shared` when it composes generic
UI around Recipe Vault-specific product concepts for both the app and MCP
views; route, transport, and data access stay with their consumers. The
[UI composition standard](ui/composition.md) governs how callers use those
components.

When a change alters a documented contract or ownership boundary, update the
applicable standard or reference page in the same change. The [architecture
overview](../architecture/overview.md) maps the current modules.
