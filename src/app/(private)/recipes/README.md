# Recipe route UI

Recipe UI lives beside the route segments that use it. The `recipes/_components`
and `recipes/_lib` folders hold the list and the form shared by new and edit pages;
`recipes/_actions` holds save and delete server actions. Detail UI belongs to
`recipes/[id]/_components`, and import forms and API adapters belong to
`recipes/import/_components` and `recipes/import/_lib`. The tag catalog and its
pagination live beside `tags/page.tsx`. Route pages compose these files and stay
thin. Form helpers convert `FormData` to the canonical validation wire format.
The route group's layout owns the shared private shell; its navigation lives in
`src/components/app`.

`TagCatalog` renders the private tag inventory as a grouped list inside one
card. Tag names link to the matching recipe filter; optional descriptions,
recipe counts, and validated previous/next cursors remain visible. The `/tags`
route supplies owner-scoped results from `TagService`, including unused tags.

Ingredient forms collect one optional free-text amount alongside the ingredient
name and notes. Edit forms retain free-text amounts such as fractions, ranges,
and phrases such as `to taste`.

The website import form posts to `/api/v1/recipes/import`, keeps the entered URL
when import fails, and opens the created recipe on success. The API returns only
safe error codes and messages to the form.

The PDF import form posts one `file` to `/api/v1/recipes/import/document`. It
keeps the selected file after a failed import and opens the created recipe on
success. Website and PDF forms maintain independent pending and error states.
