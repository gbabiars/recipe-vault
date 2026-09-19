import { auth } from "@clerk/nextjs/server";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { withMcpAuth } from "mcp-handler";
import { createRecipeMcpHandler } from "@/mcp/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const handler = createRecipeMcpHandler("/api/mcp");

const authenticatedHandler = withMcpAuth(
  handler,
  async (_, token): Promise<AuthInfo | undefined> => {
    if (!token) return undefined;
    const apiKey = await auth({ acceptsToken: "api_key" });
    if (
      !apiKey.isAuthenticated ||
      apiKey.tokenType !== "api_key" ||
      !apiKey.subject ||
      !apiKey.scopes
    )
      return undefined;
    return {
      token,
      clientId: "clerk-api-key",
      scopes: apiKey.scopes,
      extra: { userId: apiKey.subject, credentialType: "api_key" },
    };
  },
  {
    required: true,
    resourceMetadataPath: "/.well-known/oauth-protected-resource/mcp",
  },
);

export const POST = authenticatedHandler;
