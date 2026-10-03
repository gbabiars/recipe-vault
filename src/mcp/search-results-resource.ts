import { RESOURCE_MIME_TYPE, registerAppResource } from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import searchResultsHtml from "@/mcp/generated/search-results";

export const searchResultsViewUri = "ui://recipe-vault/search-results.html";

const resourceMeta = { ui: { prefersBorder: true } };

export function registerSearchResultsResource(server: McpServer) {
  registerAppResource(
    server,
    "Search results",
    searchResultsViewUri,
    { _meta: resourceMeta },
    async () => ({
      contents: [
        {
          uri: searchResultsViewUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: searchResultsHtml,
          _meta: resourceMeta,
        },
      ],
    }),
  );
}
