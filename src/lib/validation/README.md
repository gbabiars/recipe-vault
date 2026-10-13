# Validation boundary

Place shared input and domain validation schemas here as routes and recipe commands are added.

`recipe.ts` defines the canonical stored recipe shape shared by the UI, services,
repository, API, and MCP adapters. `recipeSchema` validates a complete recipe;
`recipeContentSchema` validates the same shape without its generated ID. Shared
tag-name normalization lives in `tag.ts`.
