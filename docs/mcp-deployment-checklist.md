# MCP deployment checklist

1. Apply the repository migrations to an isolated local Supabase stack first:
   `pnpm supabase:start`, `pnpm db:reset`, and `DATABASE_URL=... pnpm test:db`.
2. In the production Supabase dashboard, preserve all existing recipe RLS
   policies. Enable OAuth 2.1 Server, configure `/oauth/consent`, configure the
   Vercel HTTPS URL as Site URL, and switch JWT signing to ES256 or RS256.
3. Confirm public sign-up and anonymous sign-in are disabled in the dashboard.
4. Pre-register separate Codex and ChatGPT staging OAuth applications where their
   redirect URIs differ, review each exact redirect URI, and keep dynamic registration
   disabled. Configure their comma-separated client IDs in the explicit server allow-list.
5. In Vercel set `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `MCP_TRUSTED_OAUTH_CLIENT_IDS`, and
   `RECIPE_VAULT_OWNER_ID`. Never set an access token, refresh token,
   authorization code, Supabase secret key, or service-role key as an MCP
   credential.
6. Deploy and verify `GET /health`, then verify the protected-resource metadata
   URL and an unauthenticated `POST /api/mcp` challenge over HTTPS.
7. With each supported OpenAI product client, complete both Deny and Approve consent
   flows; initialize, confirm exactly three tools, search, get an owned recipe, save a
   valid recipe, and verify web-app persistence plus its audit event. MCP Inspector is
   diagnostic fallback only and cannot replace this proof.
8. Repeat with a different user and confirm the request is denied by the owner
   check; also confirm database RLS denies cross-owner reads/writes.
9. Install a shared Vercel-compatible rate-limit backend before production use;
   do not rely on the in-memory development fallback across serverless instances.
10. Run `pnpm test:mcp:openai` with short-lived, shell-only OAuth credentials. Record the
    client surface/version, date, redacted result, and any ChatGPT workspace limitation in
    the private deployment record.
