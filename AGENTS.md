# Recipe Vault Agent Guide

Recipe Vault is a private, multi-user Next.js 16 application. Each authenticated
Clerk user has an isolated recipe vault. Keep the application deployable and add
product behavior only when requested.

## Start here

- Use Node.js 24 or newer and pnpm 11.23.0. On a pnpm store mismatch, preserve
  the existing store and `node_modules`; stop and request specific approval
  before changing install state or store settings.
- Read the [architecture overview](docs/architecture/overview.md) and the
  applicable standards below before changing code. Use the
  [verification standard](docs/standards/verification.md) for formatting,
  checks, tests, and commit messages.
- Treat [skills](.agents/skills/) as procedures. Their linked standards and
  workflow contracts own the durable rules. The ignored `workflows/` directory
  holds task-specific run records, not shared guidance.

| Change area                                        | Read                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any code or API shape                              | [Code organization](docs/standards/code-organization.md), [agent work](docs/standards/agent-work.md)                                                                                                                                                                                                                                            |
| Authentication, ownership, credentials, MCP scopes | [Security and ownership](docs/standards/security-and-ownership.md); [database](docs/standards/database.md) when persistence changes                                                                                                                                                                                                             |
| Database schema, repositories, RPC, or RLS         | [Database](docs/standards/database.md), [security and ownership](docs/standards/security-and-ownership.md), [database reference](docs/reference/database.md)                                                                                                                                                                                    |
| Recipe behavior or API                             | [Recipe reference](docs/reference/recipes.md) and relevant standards                                                                                                                                                                                                                                                                            |
| MCP tools or transport                             | [MCP reference](docs/reference/mcp.md), [security and ownership](docs/standards/security-and-ownership.md)                                                                                                                                                                                                                                      |
| UI                                                 | [UI composition](docs/standards/ui/composition.md), [Storybook authoring](docs/standards/ui/storybook-authoring.md), [accessibility](docs/standards/ui/accessibility.md), component family guides, and the [`ui-development`](.agents/skills/ui-development/SKILL.md) and [`ui-accessibility`](.agents/skills/ui-accessibility/SKILL.md) skills |
| Explicit `$app-feature-workflow` invocation        | [Feature workflow](docs/workflows/app-feature.md) and its skill; ordinary feature requests do not invoke it automatically                                                                                                                                                                                                                       |

## Safety essentials

Preserve private per-user visibility. Bind ownership from verified Clerk
identity, never request or tool input. Browser and API data access uses Clerk
session tokens with Supabase RLS; only the verified MCP adapter may use the
Supabase service-role credential. Keep `CLERK_SECRET_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, and other server-only secrets out of browser code,
logs, and responses. The [security standard](docs/standards/security-and-ownership.md)
defines the complete rules.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
