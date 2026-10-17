import { McpServer, WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/server";
import type { AuthInfo, ServerContext } from "@modelcontextprotocol/server";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createMcpHandler } from "mcp-handler";
import { RecipeRepository } from "@/lib/db/recipe-repository";
import { TagRepository } from "@/lib/db/tag-repository";
import { getOwnerBoundMcpRecipeService, getOwnerBoundMcpTagService } from "@/lib/recipes";
import { recipeImportWorkflow } from "@/lib/recipes/recipe-import-guidance";
import { OwnerBoundRecipeService, RecipeService } from "@/lib/recipes/recipe-service";
import { OwnerBoundTagService, TagService } from "@/lib/recipes/tag-service";
import { authorizeMcpTool, mcpScopes, type McpScope } from "./auth-policy";
import {
  createRecipeMcpTools,
  createTagMcpTools,
  mcpGetRecipeOutputSchema,
  mcpRecipeImportGuidanceOutputSchema,
  mcpSearchRecipesOutputSchema,
  mcpToolSchemas,
  getRecipeImportGuidance,
} from "./tools";
import { registerRecipeImportSkill } from "./recipe-import-skill";
import { registerRecipeViewResource, recipeViewUri } from "./recipe-view-resource";
import { registerSearchResultsResource, searchResultsViewUri } from "./search-results-resource";
import { z } from "zod";

type OwnedServiceFactory = (userId: string) => OwnerBoundRecipeService;
type OwnedTagServiceFactory = (userId: string) => OwnerBoundTagService;

function denied() {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: "Access denied." }) }],
    isError: true,
  };
}

function toolContext(ctx: ServerContext, scope: McpScope, getService: OwnedServiceFactory) {
  const principal = authorizeMcpTool(ctx.http?.authInfo, scope);
  if (!principal) return null;
  return {
    userId: principal.userId,
    service: getService(principal.userId),
    requestId: String(ctx.mcpReq.id),
  };
}

function tagToolContext(ctx: ServerContext, scope: McpScope, getService: OwnedTagServiceFactory) {
  const principal = authorizeMcpTool(ctx.http?.authInfo, scope);
  if (!principal) return null;
  return {
    userId: principal.userId,
    service: getService(principal.userId),
  };
}

/** Creates the MCP handler mounted by the authenticated route. */
export function createRecipeMcpHandler(
  getService: OwnedServiceFactory = getOwnerBoundMcpRecipeService,
  getTagService: OwnedTagServiceFactory = getOwnerBoundMcpTagService,
) {
  return createMcpHandler((server) => registerRecipeTools(server, getService, getTagService), {
    serverInfo: { name: "recipe-vault", version: "0.6.0" },
    instructions: `Before saving a recipe from a link, document, image, or pasted content, call get_recipe_import_guidance. ${recipeImportWorkflow}`,
  });
}

function registerRecipeTools(
  server: McpServer,
  getService: OwnedServiceFactory,
  getTagService: OwnedTagServiceFactory,
) {
  registerRecipeViewResource(server);
  registerSearchResultsResource(server);
  registerRecipeImportSkill(server);
  server.registerTool(
    "get_recipe_import_guidance",
    {
      title: "Get recipe import guidance",
      description:
        "Read Recipe Vault's extraction rules and save_recipe field mapping before saving a recipe from a link, uploaded document, image, or pasted content.",
      inputSchema: z.object({}),
      outputSchema: mcpRecipeImportGuidanceOutputSchema,
      annotations: { readOnlyHint: true },
    },
    async () => getRecipeImportGuidance(),
  );
  server.registerTool(
    "list_tags",
    {
      title: "List tags",
      description:
        "List canonical tag names derived from the authenticated user's recipes with exact recipe usage counts. Search literal name substrings and sort by name or usage count.",
      inputSchema: mcpToolSchemas.tags,
      annotations: { readOnlyHint: true },
    },
    async (input, ctx) => {
      const context = tagToolContext(ctx, mcpScopes.read, getTagService);
      return context ? createTagMcpTools(context).list_tags(input) : denied();
    },
  );
  server.registerTool(
    "replace_tag_name",
    {
      title: "Replace tag name",
      description:
        "Rename or merge a canonical tag name across the authenticated user's recipe documents. If the target name is already present in a recipe, it is kept once.",
      inputSchema: mcpToolSchemas.replaceTagName,
      annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: true },
    },
    async (input, ctx) => {
      const context = tagToolContext(ctx, mcpScopes.write, getTagService);
      return context ? createTagMcpTools(context).replace_tag_name(input) : denied();
    },
  );
  registerAppTool(
    server,
    "search_recipes",
    {
      title: "Search recipes",
      description:
        "Search recipe document summaries from the authenticated user's vault. Use get_recipe with a returned ID to read a complete recipe document and revision.",
      inputSchema: mcpToolSchemas.search,
      outputSchema: mcpSearchRecipesOutputSchema,
      annotations: { readOnlyHint: true },
      _meta: { ui: { resourceUri: searchResultsViewUri, visibility: ["model"] } },
    },
    async (input, ctx) => {
      const context = toolContext(ctx, mcpScopes.read, getService);
      return context ? createRecipeMcpTools(context).search_recipes(input) : denied();
    },
  );
  registerAppTool(
    server,
    "get_recipe",
    {
      title: "Get recipe",
      description:
        "Get one complete recipe document and its revision, owned by the authenticated user. First use search_recipes to find a matching recipe ID.",
      inputSchema: mcpToolSchemas.recipeId,
      outputSchema: mcpGetRecipeOutputSchema,
      annotations: { readOnlyHint: true },
      _meta: { ui: { resourceUri: recipeViewUri, visibility: ["model"] } },
    },
    async (input, ctx) => {
      const context = toolContext(ctx, mcpScopes.read, getService);
      return context ? createRecipeMcpTools(context).get_recipe(input) : denied();
    },
  );
  server.registerTool(
    "replace_recipe",
    {
      title: "Replace recipe",
      description:
        "Replace a complete recipe document using the revision returned by get_recipe. A stale revision returns a conflict without overwriting newer content.",
      inputSchema: mcpToolSchemas.replaceRecipe,
      annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false },
    },
    async (input, ctx) => {
      const context = toolContext(ctx, mcpScopes.write, getService);
      return context ? createRecipeMcpTools(context).replace_recipe(input) : denied();
    },
  );
  server.registerTool(
    "save_recipe",
    {
      title: "Save recipe",
      description:
        "Create a complete recipe document. When extracting from a link, uploaded document, image, or pasted content, first call get_recipe_import_guidance, then pass the structured recipe here. Include sourceUrl only when a valid HTTP(S) recipe URL is known. Yield may be omitted when the source does not state it.",
      inputSchema: mcpToolSchemas.recipe,
      annotations: { readOnlyHint: false, idempotentHint: false, destructiveHint: false },
    },
    async (input, ctx) => {
      const context = toolContext(ctx, mcpScopes.write, getService);
      return context ? createRecipeMcpTools(context).save_recipe(input) : denied();
    },
  );
}

/** Test adapter that runs the production transport with an already verified principal. */
export async function handleMcpRequest(
  client: SupabaseClient,
  userId: string,
  request: Request,
  scopes: string[] = [mcpScopes.read, mcpScopes.write],
) {
  const service = new OwnerBoundRecipeService(
    userId,
    new RecipeService(new RecipeRepository(client)),
  );
  const tagService = new OwnerBoundTagService(userId, new TagService(new TagRepository(client)));
  const authInfo = {
    token: "test-token",
    clientId: "test-client",
    scopes,
    extra: { userId, credentialType: "oauth" },
  } satisfies AuthInfo;
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = new McpServer(
    { name: "recipe-vault", version: "0.6.0" },
    {
      instructions: `Before saving a recipe from a link, document, image, or pasted content, call get_recipe_import_guidance. ${recipeImportWorkflow}`,
    },
  );
  registerRecipeTools(
    server,
    () => service,
    () => tagService,
  );
  await server.connect(transport);
  return transport.handleRequest(request, { authInfo });
}
