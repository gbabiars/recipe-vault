# UI composition standard

Build UI from the local design system across the Next.js app and MCP views.
Consult Storybook's component guidance through the `recipe-vault-components`
MCP server before answering or changing UI. Use `docs-list` to find relevant
components and `docs-show` for their props, guidance, and examples; check each
prop before using it. The [component index](../../../src/components/ui/index.mdx),
family guides, and stories document local intent and supported composition.
Do not infer a prop from another library or a story title.

Use only props supported by the component docs, example stories, or exported
types. If a needed prop is absent, propose an API change with a consuming JSX
example and ask the user when a product decision is needed. Keep the local
component API and tokens authoritative. When designing a new reusable UI
pattern or resolving a meaningful design choice, review relevant guidance from
[shadcn/ui](https://ui.shadcn.com/), [Astryx](https://astryx.atmeta.com/),
[Atlassian Design System](https://atlassian.design/get-started), and
[Primer](https://primer.style/product/getting-started/) as useful for the task.

Use `PageLayout`, `PageHeader`, and `PageContent` for private pages and
`Heading` for sections within a page. Use `Field` and its parts when a
ready-made labeled control does not fit. Keep labels, descriptions, and errors
connected to their controls. Choose action, navigation, status, and feedback
components by their job; keep important status and instructions visible and
reserve transient feedback for brief results. Preserve semantic HTML and
reading order when composing layouts.

Prefer, in order: an existing design-system component, a supported layout or
appearance prop, then a semantic token in a CSS Module. The token definitions
are in `src/app/globals.css`; [token usage](../../../src/components/ui/tokens.mdx)
explains their roles. Use layout spacing props when they express the layout
clearly, such as `Stack gap="200"`. A local CSS value is appropriate for
component-specific geometry when no prop or token expresses it. Add a shared
token when a value has a reusable design role, not for one isolated
measurement. Existing styles need not be migrated solely to satisfy this
guidance.

The [Storybook authoring](storybook-authoring.md) and
[accessibility](accessibility.md) standards cover stories and changed UI.
Use the [`ui-development` skill](../../../.agents/skills/ui-development/SKILL.md)
for the working procedure.
