import { fromSupabaseUrl, withOAuthProtectedResource, withSupabase } from "@supabase/server";
import { getPublicSupabaseConfig } from "@/lib/env";
import { logApiEvent, requestId } from "@/lib/api/observability";
import { acceptsMcpOAuthClaims } from "@/mcp/auth-policy";
import { handleMcpRequest } from "@/mcp/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function trustedClientId() {
  const value = process.env.MCP_TRUSTED_OAUTH_CLIENT_ID?.trim();
  if (!value) throw new Error("MCP trusted OAuth client is not configured.");
  return value;
}

function ownerUserId() {
  const value = process.env.RECIPE_VAULT_OWNER_ID?.trim();
  if (!value) throw new Error("Recipe Vault owner is not configured.");
  return value;
}

function createHandler() {
  const { url, publishableKey } = getPublicSupabaseConfig();
  const clientId = trustedClientId();
  const ownerId = ownerUserId();
  return withOAuthProtectedResource(
    {
      resourceServer: (request) => `${new URL(request.url).origin}/api/mcp`,
      authorizationServer: fromSupabaseUrl(url),
    },
    withSupabase(
      {
        auth: "user",
        cors: "disabled",
        // This project configuration authenticates the request to Supabase's
        // data API; it is never accepted from an MCP client as user identity.
        env: {
          url,
          publishableKeys: { default: publishableKey },
          jwks: new URL(`${url}/auth/v1/.well-known/jwks.json`),
        },
      },
      async (request, context) => {
        if (
          !acceptsMcpOAuthClaims(context.jwtClaims, url, clientId) ||
          context.userClaims?.id !== ownerId
        ) {
          logApiEvent({
            level: "warn",
            event: "mcp_client_rejected",
            requestId: requestId(request),
          });
          return new Response(JSON.stringify({ error: "Access denied." }), {
            status: 403,
            headers: { "content-type": "application/json" },
          });
        }
        return handleMcpRequest(context.supabase, context.userClaims.id, request);
      },
    ),
  );
}

async function dispatch(request: Request) {
  try {
    const response = await createHandler()(request);
    if (response.status === 401)
      logApiEvent({ level: "warn", event: "mcp_auth_failed", requestId: requestId(request) });
    return response;
  } catch {
    logApiEvent({ level: "error", event: "mcp_request_failed", requestId: requestId(request) });
    return new Response(JSON.stringify({ error: "Unable to process MCP request." }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export const GET = dispatch;
export const POST = dispatch;
export const DELETE = dispatch;
