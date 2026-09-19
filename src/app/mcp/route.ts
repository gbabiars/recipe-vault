import { verifyClerkToken } from "@clerk/mcp-tools/next";
import { auth } from "@clerk/nextjs/server";
import { withMcpAuth } from "mcp-handler";
import { createRecipeMcpHandler } from "@/mcp/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const handler = createRecipeMcpHandler("/mcp");

const authenticatedHandler = withMcpAuth(
  handler,
  async (_, token) => {
    const verified = verifyClerkToken(await auth({ acceptsToken: "oauth_token" }), token);
    return verified
      ? { ...verified, extra: { ...verified.extra, credentialType: "oauth" } }
      : undefined;
  },
  {
    required: true,
    resourceMetadataPath: "/.well-known/oauth-protected-resource/mcp",
  },
);

export const POST = authenticatedHandler;
