# MCP deployment checklist

1. Apply the repository migrations to an isolated local Supabase stack first:
   `pnpm supabase:start`, `pnpm db:reset`, and `DATABASE_URL=... pnpm test:db`.
2. In the production Supabase dashboard, preserve all existing recipe RLS
   policies. Enable OAuth 2.1 Server, configure `/oauth/consent`, configure the
   Vercel HTTPS URL as Site URL, and switch JWT signing to ES256 or RS256.
3. Confirm public sign-up and anonymous sign-in are disabled in the dashboard.
4. Pre-register exactly one trusted OAuth application with only its verified
   redirect URIs. Keep dynamic registration disabled.
5. In Vercel set `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `MCP_TRUSTED_OAUTH_CLIENT_ID`, and
   `RECIPE_VAULT_OWNER_ID`. Never set an access token, refresh token,
   authorization code, Supabase secret key, or service-role key as an MCP
   credential.
6. Deploy and verify `GET /health`, then verify the protected-resource metadata
   URL and an unauthenticated `POST /api/mcp` challenge over HTTPS.
7. With the pre-registered test client, complete both Deny and Approve consent
   flows; use MCP Inspector or another protocol-compatible client to initialize,
   list tools, search, get an owned recipe, and save a valid recipe.
8. Repeat with a different user and confirm the request is denied by the owner
   check; also confirm database RLS denies cross-owner reads/writes.
9. Install a shared Vercel-compatible rate-limit backend before production use;
   do not rely on the in-memory development fallback across serverless instances.
