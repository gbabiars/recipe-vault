# Architecture overview

Recipe Vault is a private, multi-user Next.js application. Clerk authenticates
each user, and each user sees only their own recipes. The [security and ownership
standard](../standards/security-and-ownership.md) defines the required access
boundaries; this page maps the current implementation.

| Location                                                 | Responsibility                                                             |
| -------------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/app`                                                | Pages, API routes, OAuth metadata, and MCP route handlers.                 |
| `src/app/(private)/recipes` and `src/app/(private)/tags` | Route-specific recipe and tag UI, forms, and actions.                      |
| `src/components/app`                                     | Shared private navigation, shell, and providers.                           |
| `src/components/shared`                                  | Recipe Vault presentation shared by the app and MCP views.                 |
| `src/components/ui`                                      | Generic design-system components, tokens, family guides, and stories.      |
| `src/lib/auth`                                           | Clerk identity and Supabase browser/server client setup.                   |
| `src/lib/validation`                                     | Shared recipe schema and tag-name normalization.                           |
| `src/lib/recipes`                                        | Owner-aware recipe services, transformations, and import policy.           |
| `src/lib/db`                                             | Recipe repositories and Supabase access.                                   |
| `src/mcp`                                                | Remote MCP transport, OAuth policy, principals, scopes, and tool adapters. |

Browser and HTTP API requests carry Clerk session tokens to Supabase, where row-level
security filters by the authenticated Clerk subject. The domain service uses the
request-scoped repository. The MCP route verifies Clerk OAuth access and scope,
then binds the verified user to the same domain rules through its server adapter.
Only that adapter creates a service-role client; it never passes OAuth tokens to
Supabase.

The `/recipes` route keeps list and form UI shared by its pages in
`recipes/_components` and `recipes/_lib`, with save and delete actions in
`recipes/_actions`. Detail UI belongs under `recipes/[id]/_components`; import
forms and adapters live under `recipes/import`. The `/tags` route owns its cursor
encoding and parsing. The private route group's layout owns the application
shell. See the [code organization standard](../standards/code-organization.md)
for placement requirements.

Current behavior is described in the [recipe](../reference/recipes.md),
[database](../reference/database.md), and [MCP](../reference/mcp.md) references.
