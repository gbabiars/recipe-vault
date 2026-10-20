# Recipe Vault plugin

This private plugin packages Recipe Vault skills for local distribution. The
`recipe-vault-import` skill uses the application's existing authenticated MCP
tools. The plugin does not bundle an MCP server URL because each installation
must use the URL of its own Recipe Vault deployment.

To use it in the ChatGPT desktop app:

1. Connect your Recipe Vault deployment's `https://<your-domain>/mcp` endpoint
   as a custom MCP server in ChatGPT and complete Clerk sign-in and consent.
2. Restart the desktop app. In the Plugins Directory, select the
   **Recipe Vault Local** source and install **Recipe Vault**.
3. Start a new conversation with the plugin enabled and ask it to save a recipe
   from a link, document, image, or pasted text. Confirm that it calls
   `get_recipe_import_guidance` before `save_recipe`.

The catalog at `../../.agents/plugins/marketplace.json` makes the package
available from this repository. Add future skills under `skills/<name>/SKILL.md`;
the portable plugin format discovers them from `skills/`. Keep authorization
and recipe data operations in the existing MCP server.

See the [MCP contracts](../../docs/reference/mcp.md) for tool behavior and
the [OAuth setup guide](../../docs/guides/mcp-oauth-setup.md) for connecting a deployment.
