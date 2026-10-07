# Create recipe breadcrumbs

Revision: 1

## Summary

Add the Recipes breadcrumb to the create recipe page so its navigation matches
the other recipe pages. The breadcrumb links to `/recipes`; the existing page
heading remains “Create recipe.”

## User behavior

When an authenticated user opens `/recipes/new`, the page header shows a
Breadcrumbs navigation landmark above the “Create recipe” heading. Its only
item is the “Recipes” link, which navigates to `/recipes`. The existing recipe
form and save behavior remain unchanged.

## Scope and constraints

- Change only the create recipe page composition and focused page coverage.
- Follow the existing page header pattern used by the import page and recipe
  detail page: `Breadcrumbs` with `trailingSeparator` in `PageHeader.overline`.
- Keep route authentication, form behavior, and the heading unchanged.
- Do not add a “Create recipe” breadcrumb item because the adjacent heading
  already names the current page.

## Acceptance criteria

1. `/recipes/new` renders a navigation landmark named “Breadcrumbs.”
2. The breadcrumb contains a “Recipes” link with `href="/recipes"`.
3. The page heading remains “Create recipe.”
4. The recipe form remains rendered and its behavior is unaffected.
