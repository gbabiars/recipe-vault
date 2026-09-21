import { RESOURCE_MIME_TYPE, registerAppResource } from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import recipeViewHtml from "@/mcp/generated/recipe-view";

export const recipeViewUri = "ui://recipe-vault/recipe-view.html";

const resourceMeta = { ui: { prefersBorder: true } };

export function registerRecipeViewResource(server: McpServer) {
  registerAppResource(server, "Recipe view", recipeViewUri, { _meta: resourceMeta }, async () => ({
    contents: [
      {
        uri: recipeViewUri,
        mimeType: RESOURCE_MIME_TYPE,
        text: recipeViewHtml,
        _meta: resourceMeta,
      },
    ],
  }));
}
