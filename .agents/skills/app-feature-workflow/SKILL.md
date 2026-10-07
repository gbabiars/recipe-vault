---
name: app-feature-workflow
description: Coordinate a Recipe Vault app feature from approved specification through plan verification, implementation, review, PR, and human merge.
metadata:
  short-description: Run an app feature workflow
---

# App feature workflow

Use this skill for requested application behavior. Read `AGENTS.md` and
[`docs/agent-workflows.md`](../../../docs/agent-workflows.md) for the stage
contract, run directory, handoff format, roles, retry limits, and checks. Keep
the stage mechanics here; use `workflow_implementer` and `workflow_reviewer`
for bounded work, not one agent per stage.

1. Create or resume the feature branch and tracked run folder. If a Linear
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
   ready-for-review PR with evidence and the run folder. The human performs the
   merge; record completion once merged.

At the end of every stage, validate its handoff and finish the relevant checks,
then commit the stage changes and handoff JSON before starting the next stage.
Create a separate commit for every transition, including returns, retries, and
blocked handoffs. Follow the repository's commit message format and identify
the completed stage in the subject. Preserve earlier stage commits; do not amend
or squash them. When work returns to an earlier stage, resume from the latest
checkpoint and commit the new revision separately.

Only the human's explicit message counts as a gate approval. A validator result
does not grant approval. Report failed, skipped, and unavailable checks
accurately. Keep secrets and private customer data out of tracked artifacts.
