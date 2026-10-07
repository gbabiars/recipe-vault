# Live recipe filters implementation plan

Revision: 3

## Outcome

Make the `/recipes` search and tag controls update the URL and server-rendered
results as the user edits them, while keeping the accepted query contract and
tag matching behavior.

## Proposed component API

Make `TagFilter` controlled so the recipe filter can apply selection changes
immediately. Require both props and use the same `value` and `onValueChange`
shape documented for its underlying `ComboboxField`; do not keep an uncontrolled
or `tag`-prop path:

```ts
type TagFilterProps = {
  value: string[];
  onValueChange: (nextTags: string[]) => void;
};
```

```tsx
<TagFilter
  value={selectedTags}
  onValueChange={(nextTags) => {
    setSelectedTags(nextTags);
    applyFilters(searchText, nextTags);
  }}
/>
```

The search input remains controlled by `RecipeFilters` and receives its
`onValueChange` handler:

```tsx
<TextInput
  label="Search title"
  name="q"
  type="search"
  value={searchText}
  onValueChange={handleSearchChange}
/>
```

## Implementation steps

1. Convert `RecipeFilters` to a client component with local search and selected
   tag state initialized from its `q` and `tag` props. Use a 300 ms trailing
   timer for search updates. Keep a semantic native form with an `onSubmit`
   handler that prevents default navigation and applies filters through the
   immediate URL replacement path. Cancel a pending timer and apply the latest
   search and tags immediately on Enter or a tag selection/removal. Remove the
   existing Next `<Form action="/recipes">` wrapper.
2. Add controlled `value` and `onValueChange` props to `TagFilter`, pass them to
   `ComboboxField`, label it **Tags**, and remove its helper text. Construct
   `/recipes` query values from `q` and repeated `tag` keys, omit empty values,
   and call `router.replace` with scrolling disabled. Synchronize local control
   state when route props change. Migrate all direct `TagFilter` uses from the
   existing `tag` or no-prop API to the required controlled props.
3. Remove the submit button and its layout styles. Update recipe filter tests,
   page tests, and stories to cover debounce, immediate Enter without a native
   form navigation, immediate tag updates, multiple tag removal, URL replacement,
   empty parameters, and the requested copy changes. Update the standalone
   callers in `tag-filter.test.tsx` and `tag-filter.stories.tsx` to provide
   controlled values and change handlers. Keep real `TextInput` and
   `ComboboxField` components in interaction tests; mock only the Next
   navigation boundary if needed.

## Boundaries

- Keep recipe results in the existing server component and continue passing
  `q` and repeated `tag` values to `RecipeService`.
- Keep the tag search API and recipe ownership behavior unchanged.
- Do not add dependencies or change database/query semantics.

## Verification

- Run the focused recipes page and filter component tests in Vitest's
  Playwright-backed `components` project.
- Run the affected Storybook stories through the component MCP `test-run`, then
  preview the changed filter stories.
- Run `pnpm format`, `pnpm lint`, and `pnpm typecheck`.
- Validate the workflow handoffs before advancing stages.
