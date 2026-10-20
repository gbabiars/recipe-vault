---
name: app-feature-workflow
description: Run the Recipe Vault app feature workflow only when the user explicitly invokes $app-feature-workflow.
metadata:
  short-description: Run an app feature workflow
---

# App feature workflow

Use only when the user explicitly invokes `$app-feature-workflow`. Read the
[feature workflow contract](../../../docs/workflows/app-feature.md),
[agent work standard](../../../docs/standards/agent-work.md), and applicable
security and verification standards. The contract owns stages, approvals,
retry limits, run artifacts, roles, and checks.

1. Work in the current checkout and branch unless the user requests another.
   Create the ignored `workflows/<name>/` run folder; preserve unrelated work.
2. At Intake, inspect the request and code, use `$grilling` for unsettled
   product decisions, and prepare a spec with acceptance criteria. Present its
   complete contents for explicit approval before advancing.
3. At Plan, prepare small implementation steps, consuming call sites for new
   APIs, and verification. Present the complete plan for explicit approval.
   Do not edit app code until the current spec and plan are approved.
4. Assign bounded implementation, run focused checks, and use a fresh
   `workflow_reviewer` for independent review. Route findings or changed
   requirements through the transitions in the workflow contract.
5. Record and validate each handoff with `pnpm workflow:validate workflows/<name>`.
   After review, open a ready-for-review PR with outcome and verification
   evidence. Keep run artifacts local and out of the PR.
6. At Human Review, ask for explicit merge approval. After approval, complete
   the squash merge and feature-specific cleanup described in the contract.

Only the human's explicit message grants a gate approval. A validator result
does not. Report failed, skipped, and unavailable checks accurately; keep
secrets and private customer data out of workflow artifacts.
