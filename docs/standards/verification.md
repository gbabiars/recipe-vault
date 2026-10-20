# Verification standard

Use Node.js 24 or newer and pnpm 11.23.0 for dependency and script commands.
On a pnpm store mismatch, preserve the existing store and `node_modules`
state. Stop before changing install state or store settings, and ask for
specific approval before any workaround.

Run `pnpm format` after making changes and before checks or handoff. In a
multi-agent task, the coordinator runs it once after edits are integrated;
workers do not run repository-wide formatting concurrently. The pre-commit
hook formats staged files as a safeguard, not a replacement.

Run the narrowest relevant check while working: `pnpm lint`, `pnpm typecheck`,
`pnpm test`, or `pnpm build`. Run `pnpm check` when changes span linting, types,
and tests. `pnpm check` does not include `pnpm test:db` or `pnpm test:e2e`.
Run database tests for affected schema, RPC, or RLS changes and a build when
Next.js integration or generated output is affected. Report skipped or
unavailable checks as such, never as passes.

Add or update focused tests when changing observable behavior. Colocate tests
with the module they exercise; use `.test.tsx` for component tests and
`.test.ts` for unit tests. Test UI interactions with real components in
Vitest's Playwright-backed `components` browser project. Do not mock the UI
component whose rendering or interaction is under test; mock unrelated server
or service boundaries. Run a focused component test with
`pnpm exec vitest run --project components path/to/file.test.tsx`.

Run all live model evaluations with `pnpm eval` (currently PDF extraction and
recipe search parsing). They require `OPENAI_API_KEY`. The versioned parser
cases are in `scripts/recipe-search-parser-eval.json`; use
`pnpm eval:recipe-search-parser` for focused parser iteration. Deterministic
query serializer tests run in the regular unit suite.

Every commit, including a merge or revert, uses
`<type>[(scope)][!]: <description>`, with one of `feat`, `fix`, `docs`,
`refactor`, `test`, `perf`, `style`, `chore`, `build`, `ci`, or `revert`.
Use `style` for presentation or formatting without functional behavior. Keep
the subject at most 72 characters, without a trailing period; describe the
landed result and purpose. Use a lowercase, hyphenated scope when useful.
After a blank line, write a nonempty, factual prose body explaining why the
change was needed and what changed.

```text
fix(auth): keep expired sessions out of recipe requests

Expired sessions could reach the recipe API before authentication failed.
The request boundary now rejects them before invoking recipe services.
```
