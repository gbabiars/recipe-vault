# Recipe contracts

This page describes the current recipe shape and observable behavior. The
[architecture overview](../architecture/overview.md) maps the code, and the
[security standard](../standards/security-and-ownership.md) defines ownership.

## Recipe shape and writes

A recipe has a server-assigned `id`, `title`, `description`, optional `yield`
(`amount` and `unit`), `time` with optional `prepMinutes`, `cookMinutes`, and
`totalMinutes`, ordered `ingredients` (each with `name` and optional text
`amount` and `note`), `equipment` (each with `name` and optional `note`),
ordered string `instructions`, ordered `notes`, `tags`, and optional
`sourceUrl`. Ingredient amounts can preserve fractions, ranges, or phrases
such as `to taste`. Yield remains absent when not supplied.

`src/lib/validation/recipe.ts` defines the shared shape. `recipeSchema`
validates a complete recipe; `recipeContentSchema` validates the same fields
without the server-assigned ID. `src/lib/validation/tag.ts` owns shared tag
normalization. Recipe creation and replacement validate complete content.
Replacement uses an expected revision and reports a conflict when the stored
revision has changed. The editor and detail view support optional yield, and
stale edits do not overwrite newer changes.

## HTTP API and route UI

The authenticated HTTP API is under `/api/v1`. Reads include a revision for
optimistic concurrency; `PUT` replaces the complete recipe.

| Method   | Path                  | Behavior                                               |
| -------- | --------------------- | ------------------------------------------------------ |
| `GET`    | `/api/v1/recipes`     | Paginated owned summaries with search and filters.     |
| `GET`    | `/api/v1/tags`        | Paginated owned tag names and usage counts.            |
| `POST`   | `/api/v1/recipes`     | Creates an owned recipe.                               |
| `GET`    | `/api/v1/recipes/:id` | Returns one owned recipe and its revision.             |
| `PUT`    | `/api/v1/recipes/:id` | Replaces a complete recipe using an expected revision. |
| `DELETE` | `/api/v1/recipes/:id` | Deletes an owned recipe using an expected revision.    |

The `/recipes` list shows up to 25 matches per page. Its `page` query value
is one-based and omitted for the first page. Pagination links retain search
and tag filters; changing a filter returns to page 1. Invalid page values show
page 1, and values beyond the filtered result show the last available page.

The root URL redirects to `/recipes`. Private pages show a sidebar at 768px
and wider; below that width a title bar opens a navigation drawer. The shell
provides Recipes and an account menu with Settings and Sign out. Settings at
`/settings` links to Profile at `/settings/profile`; sign-in is standalone.

## Search and tags

`RecipeService.listRecipes(ownerId, { search, tags, page, pageSize })`
returns owned summaries. Search covers title, description, ingredient names,
equipment names, and tags. Unquoted terms are ANDed and may match across
fields; quoted phrases, `OR`, and `-` exclusions use PostgreSQL web-search
syntax. Notes and ingredient/equipment notes are excluded. Exact selected tag
names match any selected value and combine with text search using AND.

`parseRecipeSearch(prompt)` uses the OpenAI provider through the Vercel AI SDK
to extract a bounded `matchAny` list for one request. The caller serializes
the terms and phrases as quoted web-search alternatives joined by `OR`, then
passes the query to `RecipeService.listRecipes` with the verified owner ID.
Submissions are independent: the parser receives no earlier prompts or recipe
records. The prompt goes to OpenAI; retrieved recipe data stays in the
owner-scoped service and database path.

Tag names are canonical lowercase ASCII. Normalization trims surrounding
whitespace and collapses repeated internal ASCII spaces; duplicate names are
removed. Each recipe stores its names in `tags: string[]`. `TagService`
derives inventory and exact usage counts from the owner's recipes. Replacing a
name across affected recipes is atomic; deleting the last use removes the name
from inventory. `GET /api/v1/tags` returns paginated `{ name, usageCount }`
items with optional literal substring search. The `/tags` UI supports name
filtering and replacement.

An authenticated consumer uses the same domain service:

```ts
const page = await tagService.listFromRecipes(user.id, {
  sort: "name_asc",
  limit: 25,
});
await tagService.replaceNameInRecipes(user.id, {
  sourceName: "weeknight dinners",
  targetName: "weeknight",
});
```

## Imports

The recipes menu offers manual creation and imports from a website or PDF.
Website import reads bounded HTTP HTML after checking each DNS destination
and redirect. PDF import reads bounded embedded text in memory and does not
store the document. PDF files are limited to 3 MB, 20 pages, and 50,000
extracted characters; scanned image and encrypted PDFs are unsupported. Both
paths choose the first complete recipe in source order, extract and validate
recipe fields, preserve a supplied source URL, and leave yield absent when
the source does not provide it. `recipe-import-guidance.ts` shares extraction
policy with the MCP guidance tool.

The website form posts to `/api/v1/recipes/import`, keeps the entered URL after
failure, and opens the created recipe on success. The PDF form posts one `file`
to `/api/v1/recipes/import/document` and keeps the selected file after
failure. Both forms receive safe error codes and messages; parser exception
text is not returned.
