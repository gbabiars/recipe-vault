# Database implementation reference

This page describes current storage and repository behavior. Required
persistence and security rules are in the [database](../standards/database.md)
and [security](../standards/security-and-ownership.md) standards.

`src/lib/db/recipe-repository.ts` is the application adapter for recipe
persistence. It accepts an authenticated owner ID, uses the request-scoped
Clerk session JWT for ordinary requests, validates rows, and returns the
shared `Recipe` shape. Recipe rows store simple values in columns; `tags`,
`instructions`, and `notes` use Postgres arrays; structured `ingredients` and
`equipment` use JSONB. Owner-bound database functions create recipes and
perform revision-checked replacements.

`RecipeRepository.listRecipes(ownerId, search, tags, offset, limit)` returns
owned summaries and a pre-pagination total. PostgreSQL English full-text
search covers title, description, ingredient names, equipment names, and
tags. Title and tag matches carry more weight than description, ingredient,
and equipment matches. The function keeps an explicit owner predicate and
runs with the caller's RLS context. Search syntax and results visible to
callers are in the [recipe reference](recipes.md#search-and-tags).

`src/lib/db/tag-repository.ts` owns tag inventory and name replacement.
`listTags(ownerId, options)` returns canonical names with exact recipe usage
counts. Inventory pages accept name or usage cursors in either direction and
preserve the selected ordering. `replaceTagName(ownerId, sourceName,
targetName)` atomically replaces a name across the owner's recipe `tags`
arrays and removes duplicates. Recipe arrays remain the source of tag names;
there is no separate catalog.

`recordAudit` stores safe request metadata for owned recipes, including
request ID and method. The [security standard](../standards/security-and-ownership.md)
limits what may be recorded and who may use a service-role client.
