# Recipe route UI

Recipe UI lives beside the route segments that use it. The `recipes/_components`
and `recipes/_lib` folders hold the list and the document form shared by new and
edit pages; `recipes/_actions` holds save and delete server actions. Detail UI
belongs to `recipes/[id]/_components`, and import forms and API adapters belong
to `recipes/import/_components` and `recipes/import/_lib`. The tag list is
rendered by the colocated page component in `tags/page-content.tsx`; cursor
encoding and parsing live beside the route page. Route pages stay thin. Form
helpers convert `FormData` to the shared recipe-document
validation shape. The route group's layout owns the private shell; navigation
lives in `src/components/app`.

The `/recipes` list shows up to 25 matching recipes per page. Its `page` query
parameter is one-based; the first page omits it. Pagination links retain the
current search phrase and selected tags, while changing either filter returns
to page 1. Invalid page values display page 1, and page values beyond the
filtered result display the last available page.

Recipes are complete validated documents. Their `tags` arrays are the source of
tag names; the `/tags` route derives each owner's inventory and usage counts
from recipe documents. There is no separate tag table or unused-tag catalog.
The UI offers name filtering and document-backed tag-name replacement. Yield
is optional, so a missing source yield remains absent in the editor and detail
view.

Ingredient amounts are optional free text, preserving fractions, ranges, or
phrases such as `to taste`. Ingredient and equipment notes are optional text;
instructions and recipe notes retain their array order. Edit submissions replace
the complete document with an expected revision, so a stale edit is reported as
a conflict rather than silently overwriting a newer change.

The website import form posts to `/api/v1/recipes/import`, keeps the entered URL
when import fails, and opens the created recipe on success. The PDF import form
posts one `file` to `/api/v1/recipes/import/document`; it keeps the selected file
after failure. Both imports produce the validated document shape and do not
invent a yield. Website source URLs are preserved when supplied. The API returns
only safe error codes and messages to the forms.

See the [recipe document cutover runbook](../../../../docs/recipe-document-cutover-runbook.md)
for the application-first rollout and database cleanup verification steps.
