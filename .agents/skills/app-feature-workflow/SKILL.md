---
name: app-feature-workflow
description: Coordinate a Recipe Vault app feature from approved specification and plan through implementation, review, and PR.
metadata:
  short-description: Run an app feature workflow
---

# App feature workflow

Use this skill for requested application behavior. Read `AGENTS.md` and
[`docs/agent-workflows.md`](../../../docs/agent-workflows.md) for the stage
contract, run directory, handoff format, roles, retry limits, and checks. Keep
the stage mechanics here; use `workflow_implementer` and `workflow_reviewer`
for bounded work, not one agent per stage.

1. Create the local run folder under the ignored `workflows/` directory. If a
   Linear issue is supplied, read it when accessible; otherwise use supplied
   content or ask for the missing issue text. Never overwrite unrelated working
   changes.
2. At Intake, research and inspect the relevant code, then use `$grilling` to
   interview the human. Produce a readable spec and acceptance criteria. Format
   the document, print its complete contents in chat when requesting approval,
   and stop for explicit approval before recording the Intake handoff.
3. Produce an implementation plan in small steps. Show realistic consuming
   code for every new API or component shape. Format the document, print its
   complete contents in chat when requesting approval, and stop for explicit
   approval before recording the Plan handoff. Do not modify app code until
   both the current spec and plan have explicit human approval. After plan
   approval, ask the human to choose the implementation target: Local or
   Codex Cloud. That choice authorizes the corresponding branch or task setup.
   A worktree is optional local isolation and is used only when requested; it
   is not a separate implementation target.
4. For Local, create or use a feature branch in the current checkout. If the
   checkout is on `main`, create a feature branch based on `main`, or on the
   base specified in the approved plan. Preserve unrelated dirty changes and
   stop to resolve conflicts before switching branches. Use a worktree only
   when requested. For Codex Cloud, prepare a self-contained, copy-ready task
   prompt with the approved spec, plan, acceptance criteria, and checks. The
   human launches the task in the `recipe-vault` Cloud environment. The Cloud
   task implements and verifies on a remote branch, then returns its task link
   and branch name. If the `recipe-vault` environment is unavailable, pause and
   ask the human to choose a target; do not silently switch to Local. Resume from
   the returned branch and have the coordinator review it before opening a PR.
   Record the selected target and task or branch evidence in the existing
   handoff. Do not change the handoff schema or validator.
5. Implement bounded slices and run focused verification. Review the full diff
   independently, including functional and accessibility checks when relevant.
   Route findings, CI failures, and human feedback through Verify/Fix under the
   limits in the workflow guide. Reopen Intake if approved behavior changes.
6. Validate JSON handoffs before advancing. After Review passes, open a
   ready-for-review PR with a product summary, acceptance criteria, verification
   evidence, and remaining limits. Keep run artifacts local; do not include them
   in the PR.
7. Route human review feedback or CI failures through Verify/Fix or Intake as
   appropriate. At Human Review, present the PR and ask the human to approve
   merging. Only an explicit approval allows work to advance to Complete.
8. At Complete, merge with `gh pr merge --squash`, using a squash commit title
   and body that follow the repository's commit conventions. Confirm the merge
   succeeded before cleanup. Then remove this feature's run directory under
   `workflows/`. If the current checkout is on the feature branch, switch to
   `main` and delete that feature branch locally. Preserve unrelated workflow
   directories and local branches. Record the terminal `human-review →
   complete` handoff with the human's approval, merge confirmation, PR
   evidence, and cleanup result.

At the end of each stage, validate its handoff and finish the relevant checks
before advancing. Keep handoffs in the local ignored run folder.

Only the human's explicit message counts as a gate approval. A validator result
does not grant approval. Report failed, skipped, and unavailable checks
accurately. Keep secrets and private customer data out of workflow artifacts.
