# Recipe Vault Agent Guide

## Project

Recipe Vault is a private, multi-user recipe application built with Next.js 16,
React 19, TypeScript, Clerk, and Supabase. Each authenticated user has an isolated
vault. Keep the application deployable and add product behavior only when requested.

## Setup and checks

- Use Node.js 24 or newer and `pnpm` (pinned to 11.23.0) for dependency and
  script commands.
- On a pnpm store mismatch, preserve the existing store and `node_modules`
  state. Stop before changing install state or store settings, and ask the user
  for specific approval before any workaround.
- Run the narrowest relevant check while working: `pnpm lint`, `pnpm typecheck`,
  `pnpm test`, or `pnpm build`. Run `pnpm check` for changes that span linting,
  types, and tests.
- Run `pnpm format` after making changes, before running checks or handing off
  work. In a multi-agent task, the coordinating agent runs it once after edits
  are integrated; workers must not run repository-wide formatting concurrently.
  The pre-commit hook formats staged files as a safeguard, but does not replace
  this step.
- Add or update focused tests when changing observable behavior. Colocate each
  test file with the module it exercises; use `.test.tsx` for component tests
  and `.test.ts` for unit tests.
- Test UI interactions with the real components in Vitest's Playwright-backed
  `components` browser project. Do not mock a UI component whose rendering or
  interaction is under test; mock unrelated server or service boundaries.
- Run a focused browser component test with
  `pnpm exec vitest run --project components path/to/file.test.tsx`.
- Do not hand-edit generated files such as `next-env.d.ts` or `.next/` output.

## Architecture

- Keep route components and route handlers in `src/app` thin. Validate external
  inputs before invoking domain services.
- Collocate recipe UI and feature composition in private folders beside the routes that use them under `src/app/(private)/recipes` and `src/app/(private)/tags`. Put UI shared by several recipe pages at their nearest common route parent.
- Put recipe-domain services, transformations, and authorization policy in
  `src/lib/recipes`.
- Put database repositories and Supabase access adapters in `src/lib/db`.
  Features must not query Supabase directly.
- Put shared validation schemas in `src/lib/validation`.
- Put Clerk identity and Supabase browser/server client setup in `src/lib/auth`.
- Put the remote MCP transport, Clerk OAuth policy, and tool adapters in
  `src/mcp`. MCP tools must reuse recipe-domain ownership rules and enforce
  their scopes.
- Read the `README.md` in the boundary you are changing before adding code there.

## Multi-agent work

For app features and change reviews, follow `docs/agent-workflows.md`. Use
`$app-feature-workflow` for the full app feature lifecycle and `$feature-slicing`
when an approved feature needs smaller implementation steps. Reusable agents
own bounded tasks; no agent represents a feature slice or an entire stage.

- The root agent is the coordinator. It defines the outcome, assigns bounded
  work, reconciles findings, integrates edits, and owns final verification.
- Use `workflow_implementer` for an assigned implementation task and a fresh
  `workflow_reviewer` for independent plan verification or code review. For
  changes to ownership or credential boundaries, ask the reviewer to explicitly
  trace the authorization path.

- Use subagents for bounded, independent exploration, documentation research,
  diagnosis, or review when parallel work improves the outcome. Keep dependent
  decisions and short tasks with the coordinating agent.
- Give each subagent a specific question, relevant boundaries, expected evidence,
  and a concise result to return. The coordinator reconciles findings and owns
  the final design, integration, formatting, and verification.
- Give each editing task one owner and explicit file boundaries. Coordinate
  before agents edit shared files, generated output, or database state. Prefer
  read-only parallel review when work overlaps.
- For changes to authentication, RLS, MCP scopes, or service-role access,
  require `workflow_reviewer` to check owner binding, scope enforcement, and
  credential boundaries before handing off the change.

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
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are public client configuration.
  `CLERK_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only. Never expose
  them through a `NEXT_PUBLIC_*` variable, browser code, logs, responses, or
  error messages.
- Preserve private-only recipe visibility and Clerk user ownership. Browser and
  API requests use Clerk session tokens with Supabase RLS; only the verified MCP
  adapter may use the Supabase service-role credential. Do not infer an owner
  identity or grant access from request or tool input.

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

When designing a new reusable UI pattern or resolving a meaningful design
choice, review relevant guidance from [shadcn/ui](https://ui.shadcn.com/),
[Astryx](https://astryx.atmeta.com/),
[Atlassian Design System](https://atlassian.design/get-started), and
[Primer](https://primer.style/product/getting-started/) as useful for the task.
Keep the local component API and tokens authoritative.

- Call `docs-list` to find the relevant components, then `docs-show` for their
  props, guidance, and examples. Check every prop before using it, even when its
  name seems familiar.
- Use only existing props supported by the documentation, example stories, or
  exported types. If a needed prop is absent, propose an API change with a
  consuming JSX example; ask the user when the choice needs a product decision.
  Never infer an existing prop from another library or a story title.
- Before creating or updating stories, call `get-storybook-story-instructions`.
- After changing stories or components, use `test-run` to check the affected
  stories.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
