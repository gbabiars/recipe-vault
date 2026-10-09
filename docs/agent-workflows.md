# Agent workflows

`AGENTS.md` remains the authority for Recipe Vault boundaries, security, formatting,
and checks. Use a workflow skill for a repeatable unit of work and a small set of
reusable agents for bounded tasks. The root coordinator owns state, decisions,
integration, and final verification. Do not create an agent for each stage.

## App feature workflow

Invoke `$app-feature-workflow` for an application feature. Its local run artifacts
live in the ignored `workflows/<linear-id>-<prompt-summary>/` directory, or
`workflows/<prompt-summary>/` without a Linear issue. Lowercase and hyphenate the
name. Use the Linear issue ID when available; summarize the requested behavior
in the slug. Add a numeric suffix if the name already exists. After the plan is
approved, ask the user to choose where implementation runs: Local or Codex
Cloud. That choice authorizes the related branch or task setup. A worktree is
optional local isolation, used only when requested; it is not an implementation
target. For Local, create or use a feature branch in the current checkout. When
starting from `main`, base it on `main` unless the approved plan names another
base. Preserve unrelated dirty changes and resolve conflicts before switching
branches. Do not discard an unrelated dirty tree.

For Codex Cloud, prepare a copy-ready prompt containing the approved spec, plan,
acceptance criteria, and checks. The user launches it in the `recipe-vault`
Cloud environment. The task implements and verifies on a remote branch, then
returns its task link and branch name. If the `recipe-vault` environment is
unavailable, pause and ask the user to choose a target; never silently switch to
Local. Resume
from the returned branch, record the target and task or branch evidence in the
existing handoff, and have the coordinator review the full diff before opening
the ready-for-review PR. The handoff schema and validator do not change.

The run folder contains `spec.md`, `plan.md`, and numbered JSON files under
`handoffs/`. The spec and plan each carry a revision number. Increment the
revision whenever approved content changes; a prior approval never covers a
new revision. Put `Revision: 1` on its own line in each initial document. The
approval handoff records the document's SHA-256 digest (for example,
`shasum -a 256 workflows/<name>/spec.md`) so editing content invalidates its
approval even when the revision line was not updated. Never put credentials,
private customer data, or raw secrets in
workflow artifacts. Each handoff uses the schema in
[`handoff.schema.json`](workflows/handoff.schema.json). Validate the folder with
`pnpm workflow:validate workflows/<name>` before advancing a stage and before
opening or updating the PR. Keep run artifacts local and out of feature commits
and PRs. A validator can check the record; only the human's explicit message
grants approval.

Keep handoffs in the local ignored run folder.

For example, the coordinator checks the run before consuming its latest handoff:

```ts
const errors = await validateWorkflowDirectory(runDir);
if (errors.length > 0) throw new Error(errors.join("\n"));
const handoff = handoffSchema.parse(JSON.parse(await readFile(handoffPath, "utf8")));
if (handoff.to === "implementation") await assignImplementation(handoff.artifacts);
```

| Stage          | Outcome and next step                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Intake         | Read the request and accessible Linear issue, research, inspect the code, and use `$grilling` to settle product decisions. Write `spec.md` with behavior, scope, constraints, and acceptance criteria. Print the complete spec in chat when requesting approval. Human approval is required for `intake → plan`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Plan           | Write `plan.md` with the implementation approach, affected boundaries, realistic consuming call sites for new APIs, small steps, and checks. Print the complete plan in chat when requesting approval. Human approval is required for `plan → implementation`; implementation requires valid approvals for both the current spec and plan. After approval, ask whether to implement Locally or in Codex Cloud.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Implementation | Assign bounded file ownership to the implementer only after both the current spec and plan are approved and the target is selected. For Local, create or use a feature branch in the current checkout; worktrees are opt-in isolation. For Codex Cloud, provide a copy-ready task prompt for the `recipe-vault` environment; the user launches it and returns the task link and branch. If that environment is unavailable, pause for target selection. Resume from the returned branch, record target/task or branch evidence in the existing handoff, and review the full diff before opening a PR. The schema and validator remain unchanged. No app code may be modified before approval. Build in small verifiable slices. Routine details within the approved plan may be resolved locally; a product change returns to Intake, and a material technical plan change returns to Plan. Escalate an unresolved decision. |
| Verify/Fix     | The coordinator runs `pnpm format` after edits and the narrowest relevant checks. The implementer repairs failures. A stage entry allows at most three repair attempts before escalation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Review         | Start an independent reviewer against the approved spec, plan, and full diff. Check requirements, correctness, boundaries, and test gaps; add accessibility and functional checks when the change warrants them. Return findings to Verify/Fix, with at most three Review returns per run. Changes to approved behavior go to Intake.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Open PR        | Open a ready-for-review PR with product summary, acceptance criteria, evidence, and remaining limits. Keep ignored run artifacts local and out of the PR; return failed CI to Verify/Fix and re-review before updating.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Human Review   | Human feedback returns to Verify/Fix or Intake within the limits above. Present the PR and ask for explicit approval to merge. Only explicit approval allows work to advance to Complete; this stage does not merge or clean up.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Complete       | After approval, use `gh pr merge --squash` with a squash commit title and body following repository commit conventions. Confirm success, remove this feature's `workflows/` run directory, and, when currently on the feature branch, switch to `main` and delete that branch locally. Preserve unrelated run directories and branches. Record the terminal `human-review → complete` handoff with approval, merge confirmation, PR evidence, and cleanup result.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

Write one handoff for every workflow transition, including a blocked stage that
waits for human input and the final `human-review → complete` transition after
human confirmation. Number files
`0001-intake-to-plan.json`, `0002-plan-to-implementation.json`, and so on. `runId`
matches the run folder name. `artifacts` contains paths within
the run folder; `evidence` contains concise check results or links, and `findings`
contains actionable failures. Record every failed Verify/Fix repair as a
`verify-fix → verify-fix` handoff with `outcome: "retry"` and increment `attempt`
for the next attempt. The third attempt must either pass or block for human
input. A new entry from Review, CI, or Human Review resets the count to `1`.
`attempt` is `1` outside Verify/Fix. Approval handoffs record the human
statement, approved revision, and digest. A blocked
handoff stays in its current stage and names the question or failure in
`findings`.

## Reusable roles

- **Coordinator:** the root agent. It owns the run folder and stage transitions,
  asks the human at gates, assigns bounded work, reconciles findings, formats,
  validates handoffs, and reports check results.
- **`workflow_implementer`:** edits only assigned files, preserves project
  boundaries, and returns changed files plus focused evidence. The coordinator
  may keep short or dependent implementation work itself.
- **`workflow_reviewer`:** read-only and independent. Use a fresh instance for
  Review. For authentication, ownership, RLS, MCP scopes, or
  service-role changes, explicitly trace owner binding, scope enforcement, and
  credential boundaries.

Keep parallel work independent and give each editing file one owner. The
coordinator runs repository-wide formatting and checks after integration. A
skipped check is not a pass. Choose checks by the changed behavior:

| Change                                     | Relevant verification                                                                                                             |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Validation, services, API, or repositories | Focused `.test.ts` files; lint and typecheck when code spans those concerns                                                       |
| UI interaction                             | Focused Vitest `components` browser test and affected Storybook stories; inspect the running UI when layout or navigation matters |
| Database schema, RPC, or RLS               | Local migration and affected `supabase/tests`, including concurrency checks when relevant                                         |
| MCP transport, tools, or views             | Focused MCP tests and the applicable smoke or browser check                                                                       |
| Cross-boundary change                      | `pnpm check`; use `pnpm build` when Next.js integration or generated output is affected                                           |

`pnpm check` excludes `test:db` and `test:e2e`. Authenticated browser tests
require `E2E_EMAIL` and `E2E_PASSWORD`; report when those tests are unavailable.
Use a disposable local database for migration and RLS verification.

## Other work

Refactors, upgrades, design-system work, and standalone change reviews may
reuse the handoff format and roles, but should have their own workflow skills
and stage rules when repeated. A small self-contained task can stay with one
agent while following the same project checks. For a standalone diff review,
fix the comparison point and provide the originating request or spec; ask the
read-only reviewer for actionable findings with file, line, failure mode, and
evidence.
