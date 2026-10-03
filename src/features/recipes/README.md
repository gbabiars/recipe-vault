# Recipe feature boundary

This directory contains private recipe UI composition: list cards, detail cards, client forms, and server actions.
Forms convert `FormData` to the canonical validation wire format; pages stay in
`src/app/(private)` and compose these feature components. The route group's layout
owns the shared private shell; its navigation lives in `src/components/app`.

`TagCatalog` renders the private tag inventory as read-only cards. The `/tags`
route supplies owner-scoped results from `TagService`, including unused tags,
optional descriptions, exact recipe counts, and validated previous/next cursors.

Ingredient forms collect one optional free-text amount alongside the ingredient
name and notes. Edit forms retain free-text amounts such as fractions, ranges,
and phrases such as `to taste`.

The website import form posts to `/api/v1/recipes/import`, keeps the entered URL
when import fails, and opens the created recipe on success. The API returns only
safe error codes and messages to the form.

The PDF import form posts one `file` to `/api/v1/recipes/import/document`. It
keeps the selected file after a failed import and opens the created recipe on
success. Website and PDF forms maintain independent pending and error states.
