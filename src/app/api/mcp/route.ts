import { auth } from "@clerk/nextjs/server";
import { logApiEvent, requestId } from "@/lib/api/observability";
import { getMcpSupabaseClient } from "@/lib/auth/server";
import { authorizesMcpApiKey, requiredMcpScope } from "@/mcp/auth-policy";
import { handleMcpRequest } from "@/mcp/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requestedScope(request: Request) {
  if (request.method !== "POST") return null;
  try {
    return requiredMcpScope((await request.clone().json()) as Record<string, unknown>);
  } catch {
    return null;
  }
}

async function dispatch(request: Request) {
  const id = requestId(request);
  try {
    const apiKey = await auth({ acceptsToken: "api_key" });
    if (!apiKey.isAuthenticated) {
      logApiEvent({ level: "warn", event: "mcp_auth_failed", requestId: id });
      return new Response(JSON.stringify({ error: "Authentication is required." }), {
        status: 401,
        headers: { "content-type": "application/json", "www-authenticate": "Bearer" },
      });
    }
    const scope = await requestedScope(request);
    if (!authorizesMcpApiKey(apiKey, process.env.RECIPE_VAULT_OWNER_ID, scope)) {
      logApiEvent({ level: "warn", event: "mcp_api_key_rejected", requestId: id });
      return new Response(JSON.stringify({ error: "Access denied." }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }
    return handleMcpRequest(getMcpSupabaseClient(), apiKey.subject, request);
  } catch {
    logApiEvent({ level: "error", event: "mcp_request_failed", requestId: id });
    return new Response(JSON.stringify({ error: "Unable to process MCP request." }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export const GET = dispatch;
export const POST = dispatch;
export const DELETE = dispatch;
