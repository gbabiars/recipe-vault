import assert from "node:assert/strict";
import test from "node:test";
import { authorizeMcpTool, mcpPrincipal, mcpScopes } from "./auth-policy";

test("MCP principal derives its user and enforces exact tool scopes", () => {
  const base = {
    token: "redacted",
    clientId: "client",
    scopes: ["recipes:read"],
    extra: { userId: "user_owner", credentialType: "oauth" },
  };
  assert.equal(mcpPrincipal(base)?.userId, "user_owner");
  assert.equal(authorizeMcpTool(base, mcpScopes.read)?.userId, "user_owner");
  assert.equal(authorizeMcpTool(base, mcpScopes.write), null);
  assert.equal(
    authorizeMcpTool({ ...base, scopes: ["recipes:write"] }, mcpScopes.write)?.userId,
    "user_owner",
  );
  assert.equal(mcpPrincipal({ ...base, extra: { userId: "user_owner" } }), null);
});
