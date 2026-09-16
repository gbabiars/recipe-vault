# Recipe Vault MCP operator guide

Recipe Vault exposes its authenticated Streamable HTTP MCP endpoint at
`https://<your-app-domain>/api/mcp`. It is a private resource server: a client
first obtains a Supabase OAuth 2.1 access token and every tool request then runs
through the authenticated user's Supabase JWT and the existing database RLS
policies.

## Required configuration

1. In Supabase **Authentication > OAuth Server**, enable the OAuth 2.1 server.
2. In **Authentication > URL Configuration**, set the Site URL to the HTTPS
   Recipe Vault origin. Set the OAuth Server authorization path to
   `/oauth/consent`.
3. Use an ES256 or RS256 JWT signing key. The MCP middleware validates tokens
   through the project's JWKS and intentionally rejects the legacy HS256 JWT
   mode.
4. Keep public sign-up and anonymous sign-in disabled. The local configuration
   in `supabase/config.toml` does this too.
5. In **Authentication > OAuth Apps**, pre-register one trusted client. Use its
   exact client ID as `MCP_TRUSTED_OAUTH_CLIENT_ID` in Vercel. Set
   `RECIPE_VAULT_OWNER_ID` to the UUID of the one private owner account.
6. Leave dynamic client registration disabled. It is disabled in the local
   Supabase configuration and is not needed for a pre-registered client.

The consent page is `https://<your-app-domain>/oauth/consent`. It sends an
unauthenticated owner to the existing private sign-in page while preserving the
authorization request, displays the registered client identity and requested
OIDC information, and requires an explicit Approve or Deny action. Only the
configured owner UUID can complete it.

## Tools

| Tool             | Effect                                                                                                                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search_recipes` | Read-only concise recipe cards: ID, title, optional summary/timings/servings, and tags. It never returns notes or instructions.                                                                            |
| `get_recipe`     | Read-only complete owned recipe. Missing and inaccessible recipes both return the same not-found result.                                                                                                   |
| `save_recipe`    | Creates a new recipe from the canonical create schema. It is write-capable and non-idempotent; it never updates or overwrites an existing recipe. Successful creates record the existing safe audit event. |

Example connection configuration (substitute only your deployment URL; do not
put a token, API key, code, or secret in client configuration):

```json
{ "url": "https://recipes.example.com/api/mcp" }
```

## Security behavior

- OAuth protected-resource metadata is available at
  `/api/mcp/oauth-protected-resource`; unauthenticated MCP requests receive an
  RFC 9728 `WWW-Authenticate` metadata challenge.
- The official Supabase middleware validates the JWT signature against the
  project JWKS and expiration before tool code runs. The narrow MCP adapter
  additionally requires the project's Auth issuer, the `authenticated`
  audience, the configured OAuth `client_id`, and the configured owner. MCP
  tokens are used only to construct an RLS-scoped Supabase client; they are not
  forwarded to other services.
- The route checks the OAuth JWT `client_id` claim against the configured
  trusted client and checks the user against the configured owner. No tool
  accepts owner IDs, roles, claims, or bearer credentials as input.
- Reads use the existing owner RLS policies; writes use the shared recipe
  service and its existing audit function. There is no privileged routine MCP
  path.
- The process-local rate limiter is suitable for local development and tests,
  not a Vercel fleet. Before production traffic, replace its `RateLimiter`
  implementation with a shared Vercel-compatible store while preserving the
  same read/write policy interface.

## Dynamic registration later

Only enable dynamic client registration if a future specifically approved MCP
client cannot be pre-registered. In Supabase, go to **Authentication > OAuth
Server** and enable **Allow dynamic client registration**. This permits clients
to register OAuth applications automatically, so it broadens the set of client
identities that may ask the owner for consent. Before enabling it, validate that
client redirect URIs are trustworthy, retain the `MCP_TRUSTED_OAUTH_CLIENT_ID`
allow-list or deliberately redesign it, monitor registered clients/grants, and
keep explicit owner approval. Turning it on does not grant recipe access by
itself, but it materially increases consent-phishing risk.
