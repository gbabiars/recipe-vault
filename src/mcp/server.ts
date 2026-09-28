import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerNotification, ServerRequest } from "@modelcontextprotocol/sdk/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMcpHandler } from "mcp-handler";
import { RecipeRepository } from "@/lib/db/recipe-repository";
import { TagRepository } from "@/lib/db/tag-repository";
import { getOwnerBoundMcpRecipeService, getOwnerBoundMcpTagService } from "@/lib/recipes";
import { OwnerBoundRecipeService, RecipeService } from "@/lib/recipes/recipe-service";
import { OwnerBoundTagService, TagService } from "@/lib/recipes/tag-service";
import { authorizeMcpTool, mcpScopes, type McpScope } from "./auth-policy";
import {
  createRecipeMcpTools,
  createTagMcpTools,
  mcpGetRecipeOutputSchema,
  mcpToolSchemas,
} from "./tools";
import { registerRecipeViewResource, recipeViewUri } from "./recipe-view-resource";

type McpExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;
type OwnedServiceFactory = (userId: string) => OwnerBoundRecipeService;
type OwnedTagServiceFactory = (userId: string) => OwnerBoundTagService;

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

function tagToolContext(extra: McpExtra, scope: McpScope, getService: OwnedTagServiceFactory) {
  const principal = authorizeMcpTool(extra.authInfo, scope);
  if (!principal) return null;
  return {
    userId: principal.userId,
    service: getService(principal.userId),
  };
}

/** Creates a stateless Streamable HTTP handler for one concrete route. */
export function createRecipeMcpHandler(
  endpoint: string,
  getService: OwnedServiceFactory = getOwnerBoundMcpRecipeService,
  getTagService: OwnedTagServiceFactory = getOwnerBoundMcpTagService,
) {
  return createMcpHandler(
    (server) => registerRecipeTools(server, getService, getTagService),
    { serverInfo: { name: "recipe-vault", version: "0.6.0" } },
    {
      streamableHttpEndpoint: endpoint,
      disableSse: true,
      sessionIdGenerator: undefined,
    },
  );
}

function registerRecipeTools(
  server: McpServer,
  getService: OwnedServiceFactory,
  getTagService: OwnedTagServiceFactory,
) {
  registerRecipeViewResource(server);
  server.registerTool(
    "list_tags",
    {
      title: "List tags",
      description:
        "List tags owned by the authenticated user with exact recipe usage counts. Filter by used or unused tags, search literal name substrings, and sort by name or usage count.",
      inputSchema: mcpToolSchemas.tags,
      annotations: { readOnlyHint: true },
    },
    async (input, extra) => {
      const context = tagToolContext(extra, mcpScopes.read, getTagService);
      return context ? createTagMcpTools(context).list_tags(input) : denied();
    },
  );
  server.registerTool(
    "delete_unused_tag",
    {
      title: "Delete unused tag",
      description:
        "Delete one tag only if it has no recipe associations at deletion time. First call list_tags with usage=unused, then pass a returned tagId. A tag that became used will be kept. Unknown or unowned tag IDs are not distinguished.",
      inputSchema: mcpToolSchemas.deleteUnusedTag,
      annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: true },
    },
    async (input, extra) => {
      const context = tagToolContext(extra, mcpScopes.write, getTagService);
      return context ? createTagMcpTools(context).delete_unused_tag(input) : denied();
    },
  );
  server.registerTool(
    "merge_tags",
    {
      title: "Merge tags",
      description:
        "Merge one explicitly selected source tag into a distinct target tag owned by the authenticated user. Use IDs returned by list_tags; source associations move to target, duplicate recipe associations collapse, and the source tag is removed. This does not guess similar names or rename tags.",
      inputSchema: mcpToolSchemas.mergeTags,
      annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: true },
    },
    async (input, extra) => {
      const context = tagToolContext(extra, mcpScopes.write, getTagService);
      return context ? createTagMcpTools(context).merge_tags(input) : denied();
    },
  );
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
  const tagService = new OwnerBoundTagService(userId, new TagService(new TagRepository(client)));
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
  registerRecipeTools(
    server,
    () => service,
    () => tagService,
  );
  await server.connect(transport);
  return transport.handleRequest(request, { authInfo });
}
