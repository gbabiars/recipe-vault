# Recipe Vault MCP operator runbook

## Security boundary and endpoint

The deployed endpoint is `https://<your-app-domain>/api/mcp`; record the actual
production URL only in the private deployment record, not this repository. Its
protected-resource metadata is `https://<your-app-domain>/api/mcp/oauth-protected-resource`.
The only tools are `search_recipes`, `get_recipe`, and `save_recipe`.

Recipe Vault is private-only. Supabase Auth is the OAuth 2.1 authorization server;
the access token is validated with Supabase JWKS before the app checks issuer,
`authenticated` audience, token expiry, allow-listed OAuth client ID, and the private
owner ID. The authenticated JWT creates the RLS-scoped Supabase client. No service
role, database credential, personal token, static bearer token, or public access is
part of this flow. Public sign-up and anonymous sign-in must remain disabled.

## Supabase and Vercel prerequisites

1. In Supabase **Authentication > OAuth Server**, enable OAuth 2.1 Server and set
   the authorization path to `/oauth/consent`.
2. In **Authentication > URL Configuration**, set the Site URL to the deployed HTTPS
   Recipe Vault origin. Add only the exact, reviewed redirects that the registered
   client requires.
3. Use an ES256 or RS256 JWT signing key. Verify issuer is
   `<Supabase URL>/auth/v1`, audience contains `authenticated`, expiry is appropriate,
   and `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json` is available.
4. In **Authentication > OAuth Apps**, create distinct staging clients named for Codex
   and ChatGPT if both clients can be pre-registered. Review each client name,
   homepage, redirect URI, and requested scopes before use.
5. Set `MCP_TRUSTED_OAUTH_CLIENT_IDS` in Vercel to the comma-separated IDs of only the
   reviewed clients and set `RECIPE_VAULT_OWNER_ID` to the owner UUID. The legacy
   singular variable is retained only for an existing one-client deployment.
6. Preserve existing database RLS policies. Configure a shared Vercel-compatible rate
   limiter before production use; the repository's in-memory limiter is insufficient
   across serverless instances. Verify 30 normal write attempts/minute/user are allowed
   and attempt 31 is safely rejected in the shared deployment.

Do not place client secrets, authorization codes, access tokens, refresh tokens,
Supabase secret keys, database credentials, or user data in Vercel logs, the shell
history, screenshots, test fixtures, agent output, or repository files.

## Client registration decision

Prefer pre-registration for production. It constrains the server to the explicit
`MCP_TRUSTED_OAUTH_CLIENT_IDS` allow-list and permits each redirect URI to be reviewed.
Dynamic registration is disabled by default in `supabase/config.toml`.

Enable dynamic registration only for an isolated staging project when a target client
requires it. Before switching it on, record the reason and expiry date; inspect every
registered client name, URI, redirect URI, and scope; keep the owner-only consent page;
and remove the client after testing. Registration is not authorization: the owner must
still explicitly approve consent, and the Recipe Vault server must still allow-list the
resulting client ID before it can use recipes. Dynamic registration increases
consent-phishing and redirect-abuse risk and is not a production workaround.

## Deploy verification

Run from a shell that has no credentials echoed or persisted:

```sh
curl -fsS https://<your-app-domain>/api/mcp/oauth-protected-resource
curl -i -X POST https://<your-app-domain>/api/mcp \
  -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
curl -fsS https://<project-ref>.supabase.co/auth/v1/.well-known/openid-configuration
curl -fsS https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json
```

The metadata must identify `/api/mcp` and the Supabase Auth authorization server. The
unauthenticated POST must be `401`, have a `WWW-Authenticate` challenge referencing
resource metadata, and reveal no recipe data. Do not paste the response headers into a
ticket if they contain credentials.

## Codex validation

1. In Codex, add a remote MCP server using only the deployed `/api/mcp` URL. Do not
   enter an API key or a bearer token.
2. Follow the browser redirect to Supabase, sign in as the pre-provisioned private
   owner, inspect the displayed client and scopes, and approve. First exercise Deny;
   it must return without a grant and Codex must not access the server.
3. Confirm tool discovery lists exactly `search_recipes`, `get_recipe`, and
   `save_recipe`—nothing else.
4. Run: `Find my quick vegetarian dinner recipes.` Then use an ID from that result:
   `Show the ingredients and steps for <recipe ID>.`
5. Run a structured save with a unique test title, ingredients, prep/cook/total timing,
   servings, tags, dietary flags, and ordered instructions. Confirm it appears in the
   private web app and its `recipe.created` audit event is present.
6. With a second user or a known other-owner UUID, request an inaccessible recipe. The
   result must be the same non-enumerating not-found result, and an unlisted tool call
   must be rejected by MCP.

Record the test date, Codex desktop version, OS, endpoint origin, OAuth client display
name/ID (ID is private deployment data), results, and the saved recipe ID only in the
private deployment record. Never record tokens or recipe body content.

## ChatGPT validation

First determine whether the owner account/workspace offers a custom remote MCP app or
connector setup. The account/workspace administrator may need to enable apps/connectors
or custom MCP. If the control is present, add the same deployed URL, perform the owner
OAuth approval flow, confirm the exact three tools, and repeat the Codex search, detail,
structured-save, web-app persistence, audit-event, inaccessible-ID, and undeclared-tool
tests.

If the control is absent, record the exact plan, workspace, administrator setting, and
visible limitation in the private deployment record. Retest after the administrator
enables custom remote MCP/apps or the account receives access. Do not relax OAuth,
allow-listing, RLS, sign-up, or client-registration safeguards to make ChatGPT connect.

## OpenAI API smoke test

The Responses API supports a remote MCP `server_url`, an OAuth access token supplied by
the caller, an allowed-tool list, and an explicit MCP tool choice. The repository runner
uses that shape and never implements OAuth itself. Obtain a short-lived OAuth token by
the approved owner consent flow, export it only in the current shell, and run:

```sh
MCP_ENDPOINT='https://<your-app-domain>/api/mcp' \
OPENAI_API_KEY="$OPENAI_API_KEY" \
MCP_OAUTH_ACCESS_TOKEN='<short-lived OAuth access token>' \
pnpm test:mcp:openai
```

It constrains OpenAI to the three declared tool names and forces `search_recipes`. It
prints only a redacted structural pass/fail result. This supplements—not replaces—the
Codex and ChatGPT UI proof. Clear the shell variable or close the shell when done.

## Negative-test matrix

| Check                                                      | Expected result                                                            |
| ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| No token                                                   | `401` OAuth challenge; no recipe data                                      |
| Denied consent                                             | No grant and no MCP access                                                 |
| Expired, malformed, bad signature, or wrong-audience token | Authentication fails before tool execution; no recipe data                 |
| Invalid `save_recipe` body                                 | Validation error and no new recipe/audit event                             |
| Other owner's valid UUID                                   | Same `Recipe not found.` response as a missing UUID                        |
| Unlisted MCP method/tool                                   | MCP rejects it; server exposes only three tools                            |
| Write flood                                                | Shared limiter rejects excess writes without blocking 30/minute normal use |

## Troubleshooting and revocation

- **Discovery/challenge failure:** verify HTTPS origin, `/api/mcp/oauth-protected-resource`,
  and the `WWW-Authenticate` header; redeploy after correcting Vercel URL/configuration.
- **Redirect or consent failure:** compare the exact OAuth app redirect URI, Site URL, and
  `/oauth/consent`; verify the owner is signed in and its UUID equals
  `RECIPE_VAULT_OWNER_ID`.
- **JWT failure:** verify ES256/RS256, issuer, audience, expiry, project JWKS URL, and
  that the OAuth client ID appears in `MCP_TRUSTED_OAUTH_CLIENT_IDS`.
- **RLS/not found:** confirm the token is the owner’s, query the web app first, and do not
  distinguish a missing record from an inaccessible record.
- **Tool failure:** validate the canonical recipe fields and ordered child rows; inspect
  only redacted request IDs and event names.

To revoke access, remove the owner grant and the OAuth application in Supabase
**Authentication > OAuth Apps**, then remove its ID from
`MCP_TRUSTED_OAUTH_CLIENT_IDS` and redeploy. For a dynamic staging client, remove the
registered client and any grants after the test window. Confirm old tokens no longer work
and retain no credentials in incident notes.
