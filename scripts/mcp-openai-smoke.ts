/**
 * Manual, non-interactive OpenAI Responses API smoke test for the deployed MCP
 * server. It deliberately reads short-lived secrets only from the process
 * environment and prints a redacted structural result.
 */
const endpoint = process.env.MCP_ENDPOINT?.trim();
const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
const oauthAccessToken = process.env.MCP_OAUTH_ACCESS_TOKEN?.trim();

if (!endpoint || !openaiApiKey || !oauthAccessToken) {
  throw new Error(
    "Set MCP_ENDPOINT, OPENAI_API_KEY, and a short-lived MCP_OAUTH_ACCESS_TOKEN in the shell.",
  );
}

const allowedTools = ["search_recipes", "get_recipe", "save_recipe"];
const response = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    authorization: `Bearer ${openaiApiKey}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model: process.env.OPENAI_MCP_SMOKE_MODEL?.trim() || "gpt-5",
    input: "Find my quick vegetarian dinner recipes. Use Recipe Vault search.",
    tools: [
      {
        type: "mcp",
        server_label: "recipe_vault",
        server_url: endpoint,
        authorization: oauthAccessToken,
        allowed_tools: allowedTools,
        require_approval: "never",
      },
    ],
    tool_choice: { type: "mcp", server_label: "recipe_vault", name: "search_recipes" },
  }),
});

if (!response.ok) throw new Error(`OpenAI MCP smoke request failed (${response.status}).`);

const body = (await response.json()) as {
  output?: Array<{ type?: string; name?: string; server_label?: string }>;
};
const listedTools = body.output?.filter((item) => item.type === "mcp_list_tools") ?? [];
const searchCalls =
  body.output?.filter((item) => item.type === "mcp_call" && item.name === "search_recipes") ?? [];

if (listedTools.length === 0 || searchCalls.length === 0) {
  throw new Error("MCP server did not list tools and complete the required search_recipes call.");
}

console.log(
  JSON.stringify({
    result: "passed",
    endpoint: new URL(endpoint).origin,
    discoveredToolListEvents: listedTools.length,
    searchRecipeCalls: searchCalls.length,
  }),
);
