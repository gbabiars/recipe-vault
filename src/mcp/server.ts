import type { SupabaseClient } from "@supabase/supabase-js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { RecipeRepository } from "@/lib/db/recipe-repository";
import { RecipeService } from "@/lib/recipes/recipe-service";
import { requestId } from "@/lib/api/observability";
import { createRecipeMcpTools, mcpToolSchemas } from "./tools";

export function createMcpServer(client: SupabaseClient, userId: string, request: Request) {
  const tools = createRecipeMcpTools({
    userId,
    service: new RecipeService(new RecipeRepository(client)),
    requestId: requestId(request),
  });
  const server = new McpServer({ name: "recipe-vault", version: "0.5.0" });

  server.registerTool(
    "search_recipes",
    {
      title: "Search recipes",
      description: "Search concise cards from the signed-in owner's recipe vault.",
      inputSchema: mcpToolSchemas.search,
      annotations: { readOnlyHint: true },
    },
    tools.search_recipes,
  );
  server.registerTool(
    "get_recipe",
    {
      title: "Get recipe",
      description: "Get one complete recipe owned by the signed-in user.",
      inputSchema: mcpToolSchemas.recipeId,
      annotations: { readOnlyHint: true },
    },
    tools.get_recipe,
  );
  server.registerTool(
    "save_recipe",
    {
      title: "Save recipe",
      description:
        "Create a new recipe. This write is non-idempotent and never overwrites a recipe.",
      inputSchema: mcpToolSchemas.recipe,
      annotations: { readOnlyHint: false, idempotentHint: false, destructiveHint: false },
    },
    tools.save_recipe,
  );
  return server;
}

export async function handleMcpRequest(client: SupabaseClient, userId: string, request: Request) {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = createMcpServer(client, userId, request);
  await server.connect(transport);
  return transport.handleRequest(request);
}
