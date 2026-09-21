import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerNotification, ServerRequest } from "@modelcontextprotocol/sdk/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMcpHandler } from "mcp-handler";
import { RecipeRepository } from "@/lib/db/recipe-repository";
import { getOwnerBoundMcpRecipeService } from "@/lib/recipes";
import { OwnerBoundRecipeService, RecipeService } from "@/lib/recipes/recipe-service";
import { authorizeMcpTool, mcpScopes, type McpScope } from "./auth-policy";
import { createRecipeMcpTools, mcpGetRecipeOutputSchema, mcpToolSchemas } from "./tools";
import { registerRecipeViewResource, recipeViewUri } from "./recipe-view-resource";

type McpExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;
type OwnedServiceFactory = (userId: string) => OwnerBoundRecipeService;

function denied() {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: "Access denied." }) }],
    isError: true,
  };
}

function toolContext(extra: McpExtra, scope: McpScope, getService: OwnedServiceFactory) {
  const principal = authorizeMcpTool(extra.authInfo, scope);
  if (!principal) return null;
  return {
    userId: principal.userId,
    service: getService(principal.userId),
    requestId: String(extra.requestId),
  };
}

/** Creates a stateless Streamable HTTP handler for one concrete route. */
export function createRecipeMcpHandler(
  endpoint: string,
  getService: OwnedServiceFactory = getOwnerBoundMcpRecipeService,
) {
  return createMcpHandler(
    (server) => registerRecipeTools(server, getService),
    { serverInfo: { name: "recipe-vault", version: "0.6.0" } },
    {
      streamableHttpEndpoint: endpoint,
      disableSse: true,
      sessionIdGenerator: undefined,
    },
  );
}

function registerRecipeTools(server: McpServer, getService: OwnedServiceFactory) {
  registerRecipeViewResource(server);
  server.registerTool(
    "search_recipes",
    {
      title: "Search recipes",
      description: "Search concise cards from the authenticated user's recipe vault.",
      inputSchema: mcpToolSchemas.search,
      annotations: { readOnlyHint: true },
    },
    async (input, extra) => {
      const context = toolContext(extra, mcpScopes.read, getService);
      return context ? createRecipeMcpTools(context).search_recipes(input) : denied();
    },
  );
  registerAppTool(
    server,
    "get_recipe",
    {
      title: "Get recipe",
      description:
        "Get one complete recipe owned by the authenticated user. First use search_recipes to find a matching recipe ID; call this only with an ID returned by that search.",
      inputSchema: mcpToolSchemas.recipeId,
      outputSchema: mcpGetRecipeOutputSchema,
      annotations: { readOnlyHint: true },
      _meta: { ui: { resourceUri: recipeViewUri, visibility: ["model"] } },
    },
    async (input, extra) => {
      const context = toolContext(extra, mcpScopes.read, getService);
      return context ? createRecipeMcpTools(context).get_recipe(input) : denied();
    },
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
    async (input, extra) => {
      const context = toolContext(extra, mcpScopes.write, getService);
      return context ? createRecipeMcpTools(context).save_recipe(input) : denied();
    },
  );
}

/** Test adapter that runs the production transport with an already verified principal. */
export async function handleMcpRequest(client: SupabaseClient, userId: string, request: Request) {
  const service = new OwnerBoundRecipeService(
    userId,
    new RecipeService(new RecipeRepository(client)),
  );
  const authInfo = {
    token: "test-token",
    clientId: "test-client",
    scopes: [mcpScopes.read, mcpScopes.write],
    extra: { userId, credentialType: "oauth" },
  } satisfies AuthInfo;
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = new McpServer({ name: "recipe-vault", version: "0.6.0" });
  registerRecipeTools(server, () => service);
  await server.connect(transport);
  return transport.handleRequest(request, { authInfo });
}
