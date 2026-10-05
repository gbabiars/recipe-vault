---
name: recipe-feature-slice
description: Implement requested Recipe Vault features as verified vertical slices across affected application boundaries.
metadata:
  short-description: Build a verified Recipe Vault feature slice
---

# Recipe feature slice

Use this workflow for a requested behavior change that crosses project
boundaries or needs coordinated design, implementation, and review. For a small
self-contained change, work directly while keeping the same ownership and
verification expectations. `AGENTS.md` and [the agent workflow guide](../../../docs/agent-workflows.md)
remain authoritative for project rules and checks.

## Workflow

1. **Define the slice.** State one observable outcome, affected callers,
   acceptance criteria, and ownership or privacy constraints. For a new service
   or component API, show a realistic consuming call site before implementation.
2. **Map the relevant boundaries.** Read the applicable boundary READMEs and
   inspect existing code. Delegate read-only exploration or current-docs
   research only when the work is independent and large enough to benefit from
   parallel context.
3. **Assign implementation.** Use `recipe_worker` for one focused outcome and
   explicit file ownership. The worker adds focused tests for observable
   behavior changes and runs the relevant focused checks. Coordinate before
   splitting work across workers; avoid concurrent edits to shared contracts or
   files.
4. **Review the integrated diff.** Use `recipe_reviewer` to check the request,
   call sites, boundary compliance, important states, and test gaps. For
   changes to Clerk identity, RLS, MCP scopes, or service-role access, also use
   `owner_isolation_reviewer`. Route accepted findings to the worker to fix,
   then have the reviewer check the affected lines again.
5. **Verify and report.** The root coordinator integrates edits, runs
   `pnpm format`, selects the narrowest relevant checks from the workflow guide,
   resolves failures caused by the slice, and reports passed, failed, skipped,
   or unavailable checks. A skipped check is not a pass.

## UI changes

When the slice changes UI, read `src/components/ui/README.md` and the relevant
component family guide. Use the `recipe-vault-components` MCP documentation for
component props and Storybook instructions, and run the affected component and
story checks required by `AGENTS.md`.

## Example invocation

> Build one vertical slice for the requested behavior. Define acceptance
> criteria and show the intended call site. Assign implementation to
> `recipe_worker` with explicit file ownership, then have `recipe_reviewer`
> review the integrated diff. Use `owner_isolation_reviewer` if identity,
> RLS, MCP scopes, or service-role access changes. Run focused checks and report
> the result and any verification limits.
