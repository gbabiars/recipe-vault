# Recipe route UI

Recipe UI lives beside the route segments that use it. The `recipes/_components`
and `recipes/_lib` folders hold the list and recipe form shared by new and edit
pages; `recipes/_actions` holds save and delete server actions. Detail UI belongs
to `recipes/[id]/_components`, and import forms and API adapters belong to
`recipes/import/_components` and `recipes/import/_lib`. The `/tags` route renders
inventory and usage counts in `tags/page.tsx`; cursor encoding and parsing live
beside the route page. Form helpers map `FormData` to the shared recipe
validation shape. The route group's layout owns the private shell; navigation
lives in `src/components/app`.

The `/recipes` list shows up to 25 matching recipes per page. Its `page` query
parameter is one-based; the first page omits it. Pagination links retain the
current search phrase and selected tags, while changing either filter returns
to page 1. Invalid page values display page 1, and page values beyond the
filtered result display the last available page.

A recipe contains its title, description, optional yield, time values, ordered
ingredients and equipment, ordered instructions and notes, tag names, and
optional source URL. Each recipe's `tags` array supplies its tag names. The
`/tags` route derives each owner's inventory and usage counts from recipes.
The UI supports name filtering and tag-name replacement. Yield remains optional
in the editor and detail view.

Ingredient amounts are optional free text, preserving fractions, ranges, or
phrases such as `to taste`. Ingredient and equipment notes are optional text;
instructions and recipe notes retain their array order. Edit submissions replace
the complete recipe with an expected revision, so a stale edit reports a conflict
instead of overwriting a newer change.

The website import form posts to `/api/v1/recipes/import`, keeps the entered URL
when import fails, and opens the created recipe on success. The PDF import form
posts one `file` to `/api/v1/recipes/import/document`; it keeps the selected file
after failure. Both imports produce validated recipe fields and preserve a
supplied source URL. The API returns only safe error codes and messages to the
forms.
