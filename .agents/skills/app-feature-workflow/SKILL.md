---
name: app-feature-workflow
description: Coordinate a Recipe Vault app feature from approved specification through plan verification, implementation, review, and PR.
metadata:
  short-description: Run an app feature workflow
---

# App feature workflow

Use this skill for requested application behavior. Read `AGENTS.md` and
[`docs/agent-workflows.md`](../../../docs/agent-workflows.md) for the stage
contract, run directory, handoff format, roles, retry limits, and checks. Keep
the stage mechanics here; use `workflow_implementer` and `workflow_reviewer`
for bounded work, not one agent per stage.

1. Use the current checkout and existing branch by default. Create or switch
   to a branch or worktree only when the human explicitly requests one. Create
   the local run folder under the ignored `workflows/` directory. If a Linear
   issue is supplied, read it when accessible; otherwise use supplied content
   or ask for the missing issue text. Never overwrite unrelated working changes.
2. At Intake, research and inspect the relevant code, then use `$grilling` to
   interview the human. Produce a readable spec and acceptance criteria. Format
   the document before requesting approval. Stop for explicit approval before
   recording the Intake handoff.
3. Produce an implementation plan in small steps. Show realistic consuming
   code for every new API or component shape. Format the document before
   requesting approval. Stop for explicit approval before recording the Plan
   handoff.
4. Give a fresh, read-only reviewer the original request, approved artifacts,
   and repo context for Verify Plan. If it finds issues, revise the plan and
   seek fresh human approval. Do not pass the planning discussion to this
   reviewer.
5. Implement bounded slices and run focused verification. Review the full diff
   independently, including functional and accessibility checks when relevant.
   Route findings, CI failures, and human feedback through Verify/Fix under the
   limits in the workflow guide. Reopen Intake if approved behavior changes.
6. Validate JSON handoffs before advancing. After Review passes, open a
   ready-for-review PR with a product summary, acceptance criteria, verification
   evidence, and remaining limits. Keep run artifacts local; do not include them
   in the PR.
7. Route human review feedback or CI failures through Verify/Fix or Intake as
   appropriate. The human handles PR completion. After the human confirms the
   PR is merged, record the final `human-review → complete` handoff with the
   confirmation and PR evidence.

At the end of each stage, validate its handoff and finish the relevant checks
before advancing. Keep handoffs in the local ignored run folder.

Only the human's explicit message counts as a gate approval. A validator result
does not grant approval. Report failed, skipped, and unavailable checks
accurately. Keep secrets and private customer data out of workflow artifacts.
