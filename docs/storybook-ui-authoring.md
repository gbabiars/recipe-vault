# Storybook UI authoring

Use Storybook to document and exercise app UI in isolation. Keep this guidance
about story ownership, boundaries, and coverage; component use and appearance
belong in the component family docs and stories.

## Choose the story unit

- For a reusable composite component, write stories at the composite root and
  cover its constituent parts through that root. Do not create a separate story
  for every exported subcomponent.
- Give reusable app presentational compositions stories so they can be reviewed
  independently of routing and service setup.
- Recommend a story for rendered app-owned page UI. Ask the user before
  omitting one. Raise the question during planning when the reason is clear; ask
  during implementation if integration boundaries or complexity change the
  recommendation. Do not silently decide an exception.

## Cover meaningful behavior

Show the normal state and each distinct state or interaction owned by the story
unit. Page states can include loading, empty, error, filtered, or populated
results. Add interaction assertions for meaningful behavior such as navigation,
keyboard use, form submission, or status feedback. Avoid combinations that do
not change behavior.

## Isolate application boundaries

Render the real component or page composition. Mock authentication, domain
services, fetch, and routing at their boundaries with deterministic fixtures.
Keep assertions focused on visible outcomes and use accessible roles or labels
to find controls.

Before creating or changing stories, consult the `recipe-vault-components`
Storybook docs and call `get-storybook-story-instructions`. After changing a
story or component, run `test-run` for the affected stories. Storybook's
accessibility addon runs with error severity; use the
[UI accessibility guide](./ui-accessibility.md) and
accessibility skill to select checks beyond the automated scan.
