---
name: ui-development
description: Build or change Recipe Vault UI using the local design system, tokens, Storybook, and feature boundaries.
---

# UI development

Use this skill for UI work in the Next.js app and MCP views. Keep the local
design-system API and guidance authoritative.

1. Read the [UI development guide](../../../src/components/ui/README.md) and the
   README for the boundary being changed. Use `docs-list` to find relevant
   components, then `docs-show` for the components you plan to compose. Read
   their family MDX and stories for local intent and examples.
2. Prefer an existing design-system component and its supported props. Use
   layout props and semantic tokens before adding CSS. Follow the token guide
   for local values and responsive behavior. Do not invent props or new shared
   UX policy.
3. Story the composite root and cover behavior through its parts. For app UI,
   add stories for reusable presentational compositions. Recommend a page story
   for rendered page UI; ask the user before omitting it. Raise the question in
   planning when foreseeable, or during implementation if complexity or
   integration boundaries change the recommendation. Follow the repository's
   [Storybook authoring guide](../../../docs/storybook-ui-authoring.md).
4. Before authoring stories, call `get-storybook-story-instructions`. Show the
   normal state and distinct states or interactions owned by the story unit;
   mock services and routing at their boundaries with deterministic fixtures.
5. After changing stories or components, use Storybook `test-run` for affected
   stories. Follow the repository's formatting and focused-check instructions.
   Load [the UI accessibility skill](../ui-accessibility/SKILL.md) to select
   appropriate checks for each UI change; manual review should match the
   behavior affected.

The durable rules and examples live in the linked design-system guides. Do not
copy their component catalogs or token lists into this skill.
