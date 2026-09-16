# Validation boundary

Place shared input and domain validation schemas here as routes and recipe commands are added.

`recipe.ts` is the canonical wire format for recipe create and update commands. Future
web routes and MCP tools must validate against it before calling recipe-domain services;
database column names deliberately remain an implementation detail. Create commands
require at least one ingredient and one step. Update commands are non-empty patches.
