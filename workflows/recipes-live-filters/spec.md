# Live recipe filters

Revision: 1

## Request

Improve filtering on `/recipes` so recipe results update while the user edits
search and tag filters. Remove the obsolete filter hint and submit button.

## Current behavior

The `/recipes` page reads a title search from `q` and selected tags from
repeated `tag` query values. It loads matching recipes on the server. The
filter form currently submits only when the user presses **Filter**. The tag
control supports multiple values but is labeled **Tag** and displays a hint
about the number of available tags.

## Accepted behavior

- Search recipe titles as the user types, using a 300 ms trailing debounce.
- Pressing Enter applies the current search immediately.
- Adding or removing a tag immediately updates the URL and applies the latest
  search text, even when its debounce is still pending.
- Replace the current URL for search and tag changes so the browser history does
  not accumulate filter edits.
- Keep using `q` for search and repeated `tag` query values for multiple tags.
- Label the multi-select **Tags**, remove its hint text, and remove the **Filter**
  button.
- Continue loading results through the existing server-side recipe query and
  preserve the current semantics: a recipe matches when it has any selected
  tag.

## Scope

Update the `/recipes` filter interaction and its focused tests and Storybook
coverage. Keep the existing title-search and tag-filter query contract and
server-side recipe ownership behavior.

## Out of scope

- Changing recipe search fields, tag matching semantics, or tag availability.
- Changing filtering on other pages or APIs.
- Adding new dependencies or altering authentication and data access policy.

## Acceptance criteria

1. Typing in the title search updates `q` and refreshes results only after the
   trailing debounce; Enter applies the current value immediately.
2. Selecting or removing a tag immediately updates repeated `tag` values and
   refreshes results while preserving the latest search text.
3. Filter updates replace the current history entry instead of adding entries.
4. Clearing search or removing all tags removes the corresponding query values.
5. The tag field is labeled **Tags**, its helper text is absent, and no **Filter**
   button is rendered.
6. Existing server-side search, any-selected-tag matching, empty results, and
   loading feedback continue to work.
