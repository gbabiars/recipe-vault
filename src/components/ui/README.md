# UI development

Build UI from the design system so behavior, appearance, and accessibility stay
consistent across the Next.js app and MCP views.

## Build from intent

1. Identify the task the UI needs to support.
2. Find the closest component in the [Storybook UI index](./index.mdx), then read
   its family guide and stories before composing it.
3. Prefer design-system components and their supported layout or appearance
   props. Use semantic tokens in CSS Modules when local styling is still needed.
4. Give the composition a Storybook story when it represents a reusable
   component or meaningful page UI. Follow the
   [Storybook authoring guide](../../../docs/storybook-ui-authoring.md).
5. Check the caller's accessibility responsibilities in the family guide and
   follow the [accessibility guidance](../../../docs/ui-accessibility.md) for
   changed UI.

The family guides describe intent, composition, and accessibility duties.
Storybook's component docs show examples and supported usage; exported TypeScript
types define exact signatures. Do not infer a prop from another component or
library.

## Shared composition rules

- Use `PageLayout`, `PageHeader`, and `PageContent` for private pages. Use
  `Heading` for sections inside a page.
- Use `Field` and its parts when a ready-made labeled control does not fit. Keep
  labels, descriptions, and errors connected to their controls.
- Choose an action, navigation, status, or feedback component by its job. Keep
  important status and instructions visible; reserve transient feedback for
  brief results.
- Preserve semantic HTML and reading order when using layout components.

These rules describe established compositions. A new shared UX rule needs a
product decision before it becomes part of this guide.

## Styling and tokens

Prefer, in order: a design-system component, a supported layout or appearance
prop, then a semantic token in a CSS Module. The token definitions live in
[`src/app/globals.css`](../../app/globals.css); [token usage](./tokens.mdx)
explains their roles. Use layout component spacing props when they express the
layout clearly, for example `Stack gap="200"`.

A local CSS value is appropriate for component-specific geometry when no
existing token or prop expresses it. Add a shared token when a value has a
reusable design role, not for a single isolated measurement. This is guidance
for new work, not a requirement to migrate existing styles.

## Progressive references

- [Storybook component index](./index.mdx): find a component by intent.
- [Token usage](./tokens.mdx): semantic token families and responsive sizing.
- [Storybook authoring guide](../../../docs/storybook-ui-authoring.md): story
  ownership, boundaries, and coverage.
- [Accessibility guidance](../../../docs/ui-accessibility.md): shared target
  and validation approach.
