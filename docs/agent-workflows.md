# Agent workflows

`AGENTS.md` remains the authority for Recipe Vault boundaries, security, formatting,
and checks. Use a workflow skill for a repeatable unit of work and a small set of
reusable agents for bounded tasks. The root coordinator owns state, decisions,
integration, and final verification. Do not create an agent for each stage.

## App feature workflow

Invoke `$app-feature-workflow` for an application feature. Its durable record lives
in `workflows/<linear-id>-<prompt-summary>/`, or `workflows/<prompt-summary>/`
without a Linear issue. Lowercase and hyphenate the name. Use the Linear issue ID
when available; summarize the requested behavior in the slug. Add a numeric
suffix if the name already exists. Use `feat/<same-name>` for the branch. Work in
the current checkout; do not discard an unrelated dirty tree to switch branches.

The run folder contains `spec.md`, `plan.md`, and numbered JSON files under
`handoffs/`. The spec and plan each carry a revision number. Increment the
revision whenever approved content changes; a prior approval never covers a
new revision. Put `Revision: 1` on its own line in each initial document. The
approval handoff records the document's SHA-256 digest (for example,
`shasum -a 256 workflows/<name>/spec.md`) so editing content invalidates its
approval even when the revision line was not updated. Never put credentials,
private customer data, or raw secrets in
tracked artifacts. Each handoff uses the schema in
[`handoff.schema.json`](workflows/handoff.schema.json). Validate the folder with
`pnpm workflow:validate workflows/<name>` before advancing a stage and before
opening or updating the PR. A validator can check the record; only the human's
explicit message grants approval.

### Stage commit checkpoints

Before starting the next stage, commit the completed stage's changes together
with its handoff JSON. This applies to every transition, including returns,
retries, and blocked handoffs. Validate the run and finish the stage's relevant
checks before committing. Give each checkpoint its own commit; do not amend or
squash an earlier stage checkpoint. Use the repository's commit message format
and identify the completed stage in the subject. When a stage is returned,
continue from the latest checkpoint and commit its revisions separately so the
earlier state remains available for comparison or recovery. Use the commit
history to inspect the stage sequence and
`git diff <earlier-checkpoint>..<later-checkpoint>` to compare changes between
stages.

For example, the coordinator checks the run before consuming its latest handoff:

```ts
const errors = await validateWorkflowDirectory(runDir);
if (errors.length > 0) throw new Error(errors.join("\n"));
const handoff = handoffSchema.parse(JSON.parse(await readFile(handoffPath, "utf8")));
if (handoff.to === "implementation") await assignImplementation(handoff.artifacts);
```

| Stage          | Outcome and next step                                                                                                                                                                                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Intake         | Read the request and accessible Linear issue, research, inspect the code, and use `$grilling` to settle product decisions. Write `spec.md` with behavior, scope, constraints, and acceptance criteria. Human approval is required for `intake → plan`.                                                                                |
| Plan           | Write `plan.md` with the implementation approach, affected boundaries, realistic consuming call sites for new APIs, small steps, and checks. Human approval is required for `plan → verify-plan`.                                                                                                                                     |
| Verify Plan    | Start a fresh, read-only reviewer with the original request, approved spec and plan, and relevant repo context. Do not pass the planner's debate or preferred answer. Pass to Implementation, or return findings to Plan. A revised plan requires new human approval and another fresh review.                                        |
| Implementation | Assign bounded file ownership to the implementer. Build in small verifiable slices. Routine details within the approved plan may be resolved locally; a product change returns to Intake, and a material technical plan change returns to Plan. Escalate an unresolved decision.                                                      |
| Verify/Fix     | The coordinator runs `pnpm format` after edits and the narrowest relevant checks. The implementer repairs failures. A stage entry allows at most three repair attempts before escalation.                                                                                                                                             |
| Review         | Start an independent reviewer against the approved spec, plan, and full diff. Check requirements, correctness, boundaries, and test gaps; add accessibility and functional checks when the change warrants them. Return findings to Verify/Fix, with at most three Review returns per run. Changes to approved behavior go to Intake. |
| Open PR        | Open a ready-for-review PR with a summary of acceptance criteria, evidence, remaining limits, and the run folder. Failed PR CI returns to Verify/Fix; re-review the changed diff before updating the PR.                                                                                                                              |
| Human Review   | Human feedback returns to Verify/Fix, with at most three repair attempts per feedback round. A change to approved behavior returns to Intake. The human merges; record the merged PR as completion.                                                                                                                                   |

Write one handoff for every transition, including a blocked stage that waits for
human input. Number files `0001-intake-to-plan.json`, `0002-plan-to-verify-plan.json`,
and so on. `runId` matches the run folder name. `artifacts` contains paths within
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
  Verify Plan and Review. For authentication, ownership, RLS, MCP scopes, or
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
