# Database boundary

`recipe-repository.ts` is the application adapter for recipe persistence. It
accepts the authenticated owner ID and uses the request-scoped Clerk session
JWT, so database row-level security remains the enforcement boundary. Features
use this repository instead of querying Supabase directly. Recipe rows store
simple values in columns, arrays such as `tags`, `instructions`, and `notes` in
Postgres arrays, and structured `ingredients` and `equipment` in JSONB. The
repository validates rows and returns the shared `Recipe` shape. Writes use
owner-bound database functions to create recipes and revision-check replacements.

`RecipeRepository.listRecipes(ownerId, search, tags, offset, limit)` returns
owned summaries and a pre-pagination total. Search uses PostgreSQL English
full-text search over title, description, ingredient names, equipment names,
and tags. Unquoted terms are ANDed and may match across fields; quoted phrases,
`OR`, and `-` exclusions use PostgreSQL web-search syntax. Title and tag
matches receive more weight than description, ingredient, and equipment matches. Recipe
notes and ingredient/equipment notes are not searched. Selected exact tag names
match any selected value and combine with text search using AND. The database
function keeps an explicit owner predicate and runs with the caller's RLS
context.

`tag-repository.ts` owns tag inventory and name replacement. `listTags(ownerId,
options)` returns canonical names with exact recipe usage counts. Inventory pages
accept name or usage cursors in either direction and preserve the selected
ordering. `replaceTagName(ownerId, sourceName, targetName)` atomically replaces
a name across the owner's recipe `tags` arrays and removes duplicates. Those
arrays are the source of tag names; there is no separate tag catalog.

`recordAudit` stores safe request metadata for owned recipes. It records the
request ID and method, never headers, credentials, or recipe content. The
verified MCP adapter is the only server-side service-role caller. It binds the
verified Clerk user and checks tool scope before creating the server-only
Supabase client. Never expose that credential to a browser, route input, or
MCP tool argument.
