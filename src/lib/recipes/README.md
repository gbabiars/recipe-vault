# Recipe library boundary

`recipe-service.ts` provides the owner-aware recipe command and query surface
for the web UI, HTTP API, and MCP adapters. `index.ts` composes it with the
request-scoped repository. Application routes use these services rather than
querying Supabase. Recipe creation and replacement validate complete recipe
content; replacement checks the expected revision and reports a conflict when
the stored revision changes. Ownership comes from authenticated Clerk identity,
never from recipe content or request fields.

The shared `Recipe` shape contains an ID, title, description, optional yield,
prep/cook/total time, ordered ingredients and equipment, ordered instructions
and notes, a tag-name array, and an optional source URL. Ingredient entries have
a name and optional text amount and note. Equipment entries have a name and an
optional note. Yield contains a positive amount and unit and remains optional.

`RecipeService.listRecipes(ownerId, { search, tags, page, pageSize })` provides
literal, case-insensitive substring search across title, description, ingredient
names, equipment names, and tags. The complete trimmed phrase occurs within one
field. Exact selected tags match any selected tag and combine with text search
using AND.

Tag names are canonical lowercase ASCII. Normalization trims surrounding
whitespace and collapses repeated internal ASCII spaces; duplicate names are
removed. Each recipe stores its tags in `tags: string[]`. `TagService` derives
inventory and usage counts from the owner's recipes and atomically replaces
canonical names across their arrays. Removing a name from its last recipe also
removes it from inventory.

An authenticated consumer can list the derived inventory and replace a name
through the same domain service:

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

Website import reads bounded HTTP HTML after checking each DNS destination and
redirect. PDF import reads bounded embedded text in memory. Both import paths
extract and validate recipe fields before saving through the recipe service.
They preserve a supplied source URL, select the first complete recipe in source
order, and leave yield absent when the source does not provide it. PDF reader
errors return safe classifications without exposing parser exception text.
