import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandlerClerk,
} from "@clerk/mcp-tools/next";
import { mcpScopes } from "@/mcp/auth-policy";

const handler = protectedResourceHandlerClerk({
  scopes_supported: [mcpScopes.read, mcpScopes.write, "offline_access"],
});
const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
