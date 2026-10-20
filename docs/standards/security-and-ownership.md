# Security and ownership standard

Recipe Vault is private. Clerk is the only end-user identity provider, and
every recipe operation must remain bound to the authenticated user's vault.
Never infer an owner ID or grant access from request fields, recipe content, or
MCP tool input.

Browser and `/api/v1` requests use Clerk session tokens through Supabase's
native third-party-auth integration. Supabase row-level security compares each
row's `owner_id` with the verified JWT subject. Repository and database write
paths must preserve owner binding. The [database standard](database.md) covers
persistence practices.

MCP requests verify Clerk OAuth at the Next.js boundary. Each tool enforces its
required scope before calling the owner-aware recipe service. Bind the verified
Clerk user ID in the MCP adapter; do not accept an identity claim in tool
arguments. OAuth access tokens never go to Supabase. Only the verified MCP
adapter may create a server-only Supabase service-role client. Do not expand
that exception to browser or ordinary API requests.

Never commit `.env.local`, secrets, or real credentials. Use `.env.example`
only for non-sensitive placeholders. `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are public client configuration.
`CLERK_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only. Never expose
server-only credentials through a `NEXT_PUBLIC_*` variable, browser code, logs,
responses, or error messages. The same server-only rule applies to `LD_SDK_KEY`.

Audit events may contain safe request metadata such as request ID and method.
Never put recipe bodies, cookies, credentials, or request headers in audit
metadata or application logs. Import and parser errors sent to clients must
not expose underlying exception text.

Changes to authentication, RLS, MCP scopes, or service-role access require an
independent `workflow_reviewer` to trace owner binding, scope enforcement, and
credential boundaries before handoff. See the [agent work standard](agent-work.md).
