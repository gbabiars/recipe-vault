# Agent workflows

Use these workflows for work that benefits from independent investigation or
review. For a small, self-contained change, one agent can follow the same
quality gates without spawning subagents. `AGENTS.md` remains the authority for
project boundaries, security, formatting, and checks.

## Roles

| Role                       | Where it lives                                     | Responsibility                                                                    |
| -------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------- |
| Coordinator                | Root agent, directed by `AGENTS.md` and this guide | Own requirements, decisions, task boundaries, integration, and final verification |
| `recipe_worker`            | `.codex/agents/recipe_worker.toml`                 | Implement one assigned slice and return focused evidence                          |
| `recipe_reviewer`          | `.codex/agents/recipe_reviewer.toml`               | Independently inspect a diff for behavior, correctness, boundaries, and test gaps |
| `owner_isolation_reviewer` | `.codex/agents/owner_isolation_reviewer.toml`      | Inspect Clerk, RLS, MCP, and service-role ownership risks when relevant           |

The coordinator remains the root thread; spawning another coordinator would
duplicate ownership. Use the built-in `explorer` for read-only codebase mapping
when that work is large enough to delegate.

## Shared handoff

The coordinating agent owns the task from requirements through final
verification. Give each subagent a bounded task with:

- The question to answer and the files or boundary to inspect.
- The relevant behavior and constraints from the request.
- Whether the task is read-only or which files the agent may edit.
- The expected result: findings with file references, a proposed call site, or
  a completed change with its verification evidence.

Keep parallel tasks independent. Assign one owner to each edited file. Do not
run repository-wide formatting, builds, migrations, or checks concurrently in a
shared checkout. The coordinator resolves conflicting findings, integrates
edits, runs `pnpm format`, and reports which checks passed, failed, or were not
run. A skipped test is not a passing test.

## Feature slice

**Use for:** a requested feature or behavior change that crosses a route,
feature, service, repository, UI component, or MCP boundary.

The reusable `$recipe-feature-slice` skill packages this workflow for direct
invocation.

1. **Define one outcome.** Record the user-visible behavior, affected callers,
   owner and privacy rules, and acceptance criteria. Keep each implementation
   slice small enough to verify independently. Show a realistic consuming call
   site before choosing a new service or component API.
2. **Explore in parallel when useful.** Ask one read-only agent to map existing
   code and boundary READMEs. Ask another to check relevant Next.js, Supabase,
   Clerk, MCP, or Storybook guidance. Each returns only facts needed for the
   slice, with source locations and open questions. The coordinator chooses the
   design and resolves product decisions.
3. **Implement with one file owner.** Assign the slice to `recipe_worker` with
   explicit file boundaries. If independent workers are needed, separate their
   files and interfaces first; integrate one slice before changing shared
   contracts. Add focused tests when observable behavior changes.
4. **Review the integrated diff.** Have `recipe_reviewer` check
   the acceptance criteria, call sites, ownership boundaries, and missing
   states. For changes to auth, RLS, MCP scopes, or service-role access, add an
   `owner_isolation_reviewer` review. Give actionable findings back to the file
   owner.
5. **Verify and finish.** The coordinator runs `pnpm format`, the narrowest
   relevant checks, and any runtime or database verification needed by the
   change. Resolve failures caused by the slice and report the result with any
   checks that could not run.

Choose checks by the affected behavior:

| Change                                     | Relevant verification                                                                                                             |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Validation, services, API, or repositories | Focused `.test.ts` files, then `pnpm lint` and `pnpm typecheck` when code changes span those concerns                             |
| UI interaction                             | Focused Vitest `components` browser test and affected Storybook stories; inspect the running UI when layout or navigation matters |
| Database schema, RPC, or RLS               | Local migration and affected `supabase/tests` verification, including concurrency checks where relevant                           |
| MCP transport, tools, or views             | Focused MCP tests and the applicable local smoke or browser check                                                                 |
| Cross-boundary change                      | `pnpm check`; use `pnpm build` when Next.js integration or generated output is affected                                           |

`pnpm check` does not include `test:db` or `test:e2e`. Authenticated browser tests
require `E2E_EMAIL` and `E2E_PASSWORD`; report when those tests are skipped or
cannot run. Use a disposable local database for migration and RLS verification.

**Invocation example:**

> Implement one vertical slice for the requested behavior. Use read-only
> subagents to map the affected boundaries and check current documentation.
> Show the intended call site, then assign implementation to `recipe_worker`
> with explicit file ownership. Have `recipe_reviewer` review the integrated
> diff. Run the focused checks and report the behavior delivered, evidence,
> and remaining limits.

## Change review

**Use for:** a branch, pull request, or working diff that needs an independent
assessment before merge or handoff. Fix the comparison point first, such as
`main`, a commit, or the merge base, and obtain the originating request or spec.

1. **Establish scope.** The coordinator records the comparison point, changed
   files, requested behavior, and applicable project guidance. Separate
   unrelated pre-existing failures from issues introduced by the diff. For a
   historical commit, use the guidance and boundary READMEs at that commit to
   judge its changes; use current `AGENTS.md` for safe execution in the working
   checkout.
2. **Review independently.** Give `recipe_reviewer` correctness, behavior,
   documented standards, and test coverage. For high-risk ownership changes,
   concurrently use `owner_isolation_reviewer` to trace Clerk identity through
   the API or MCP adapter to the service, repository, and RLS or service-role
   boundary. Agents must not edit or run mutating database commands during
   review.
3. **Reconcile findings.** The coordinator removes duplicates and checks each
   claim against the diff. Report findings first, ordered by severity, with
   file and line, concrete failure mode, and the evidence needed to reproduce
   or verify it. Distinguish a confirmed defect from a question or test gap.
4. **Close the loop when fixes are requested.** Assign each accepted finding to
   one file owner. Re-review the changed lines, run `pnpm format` and relevant
   checks after integration, and state whether each finding was resolved.

**Invocation example:**

> Review this branch against `main` with `recipe_reviewer` and
> `owner_isolation_reviewer` as read-only subagents. Give both the originating
> request, wait for their findings, and return only actionable, prioritized
> findings with file and line references and a short account of checks
> performed.

For a small diff, use one reviewer. For independent high-risk areas, add a
specialist review only when its scope is clear. More agents do not replace a
precise spec or a runnable verification environment.
