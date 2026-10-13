# Validation boundary

Place shared input and domain validation schemas here as routes and recipe
commands are added.

`recipe.ts` defines the canonical recipe shape shared by the UI, services,
repository, API, and MCP adapters. `recipeSchema` validates a complete recipe;
`recipeContentSchema` validates the same fields without the server-assigned ID.
Shared tag-name normalization lives in `tag.ts`.
