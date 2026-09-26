# Recipe Vault Agent Guide

## Project

Recipe Vault is a private-only recipe application built with Next.js 16, React 19,
TypeScript, and Supabase. This repository is currently Iteration 0: keep the
foundation deployable without adding product behavior that has not been requested.

## Setup and checks

- Use Node.js 20.9 or newer and `pnpm` (pinned to 11.23.0) for dependency and
  script commands.
- Run the narrowest relevant check while working: `pnpm lint`, `pnpm typecheck`,
  `pnpm test`, or `pnpm build`. Run `pnpm check` for changes that span linting,
  types, and tests.
- Always run `pnpm format` after making changes, before running checks or
  handing off work. The pre-commit hook formats staged files as a safeguard,
  but it does not replace this required formatting step.
- Add or update focused tests when changing observable behavior. Colocate
  component tests with their components; put other tests in `tests/`.
- Do not hand-edit generated files such as `next-env.d.ts` or `.next/` output.

## Architecture

- Keep route components and route handlers in `src/app` thin. Validate external
  inputs before invoking domain services.
- Put recipe UI and feature composition in `src/features/recipes`.
- Put recipe-domain services, transformations, and authorization policy in
  `src/lib/recipes`.
- Put database repositories and Supabase access adapters in `src/lib/db`.
  Features must not query Supabase directly.
- Put shared validation schemas in `src/lib/validation`.
- Put Supabase browser/server client setup and future auth policy in
  `src/lib/auth`.
- Put the future remote MCP transport and adapters in `src/mcp`; it must reuse
  the web/API authorization and recipe-domain policies.
- Read the `README.md` in the boundary you are changing before adding code there.

## API design

- Show the consuming code whenever proposing or discussing an API. Include at
  least one realistic call-site example alongside the recommendation so its
  ergonomics can be reviewed before implementation. For UI components, show
  JSX that exercises the intended composition and important props or states.
- When comparing materially different API shapes, include a consuming-code
  example for each. Use the examples to check names, defaults, and composition,
  and revise the API when a call site feels awkward or unclear.

## Security and configuration

- Never commit `.env.local`, secrets, or real credentials; use `.env.example`
  only for non-sensitive placeholders.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public
  client configuration. Never expose `SUPABASE_SERVICE_ROLE_KEY` through a
  `NEXT_PUBLIC_*` variable, browser code, logs, responses, or error messages.
- Preserve private-only recipe visibility. Do not guess the sign-in provider,
  owner email, or first MCP client; these are deferred product decisions.

## Change discipline

- Break plans, implementation prompts, and changes into small iterative steps,
  each with one focused outcome and a way to verify it. Prefer narrow vertical
  slices; split coupled work horizontally when needed. Keep large cross-cutting
  changes out of a single step.
- Preserve existing public behavior unless the request explicitly changes it.
- Do not add production dependencies, change deployment configuration, or alter
  authentication policy without a clear task requirement.
- Update `README.md` or the applicable boundary README when a change alters a
  documented contract or ownership boundary.

## Commit messages

- Write every commit, including merges and reverts, as
  `<type>[(scope)][!]: <description>`. Use `feat`, `fix`, `docs`, `refactor`,
  `test`, `perf`, `style`, `chore`, `build`, `ci`, or `revert`. Use `style` for
  presentation or formatting changes without functional behavior.
- Keep the subject at 72 characters or fewer, without a trailing period.
  Describe the result that landed and its purpose, not work planned for later.
  Use a lowercase, hyphenated scope when one helps identify the area.
- After a blank line, write a nonempty prose body that explains why the change
  was needed and what the commit actually changed. Keep it factual and concise;
  use more detail when the reason or implementation is not obvious.

```text
fix(auth): keep expired sessions out of recipe requests

Expired sessions could reach the recipe API before authentication failed.
The request boundary now rejects them before invoking recipe services.
```

## Storybook component guidance

When working on UI components, use the `recipe-vault-components` MCP server to
consult Storybook's component guidance before answering or changing UI. Read
`src/components/ui/README.md` and the linked family guide for local intent and
token usage.

When designing or revising a reusable UI component, review relevant patterns in
all four design systems: [shadcn/ui](https://ui.shadcn.com/),
[Astryx](https://astryx.atmeta.com/),
[Atlassian Design System](https://atlassian.design/get-started), and
[Primer](https://primer.style/product/getting-started/). Consider their guidance
on behavior, accessibility, composition, and states alongside the local
Storybook guidance. Keep the local component API and tokens authoritative.

- Call `docs-list` to find the relevant components, then `docs-show` for their
  props, guidance, and examples. Check every prop before using it, even when its
  name seems familiar.
- Use only props supported by the documentation or example stories. If a needed
  prop is absent, ask the user instead of inferring an API from another library
  or component. Verify a prop in docs or stories even if a story title suggests
  it exists.
- Before creating or updating stories, call `get-storybook-story-instructions`.
- After changing stories or components, use `test-run` to check the affected
  stories.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
