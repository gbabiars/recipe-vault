---
name: app-feature-merge
description: Only finalize and squash merge PRs created by app-feature-workflow, removing their workflow artifacts with gh.
metadata:
  short-description: Finalize and squash merge a feature PR
---

# App feature merge

Use this skill after the feature PR has completed review and is ready to merge.
It receives the run ID and PR number, for example:

```text
$app-feature-merge rv-123-live-filters 123
```

Keep `workflows/<run-id>/` on the feature branch for the full PR review and
rework period. Remove the entire directory only during this finalization. The
final PR tree and squash commit must contain the feature and necessary durable
product documentation, but no files under that run directory. Do not add
workflow-stage summaries to the PR description or comments, and do not derive
the merge message from the PR description. Earlier feature-branch commits may
still appear in the PR's Commits view; the final PR diff and squash commit use
the net final tree, so removed run files do not land on `main`.

Use `gh` for all GitHub operations. If it is unavailable, unauthenticated, or
cannot merge the PR, stop and report the blocker. Do not fall back to the
GitHub UI, bypass repository protections, or use `--admin`.

## Confirm readiness

1. Check `command -v gh` and `gh auth status`. Stop before changing the branch
   if either check fails.
2. Confirm the checkout is the feature branch for this run and has no unrelated
   working changes. The expected branch is `feat/<run-id>`. Do not discard or
   overwrite a dirty tree.
3. Inspect the PR with
   `gh pr view <pr-number> --json number,state,isDraft,baseRefName,headRefName,headRefOid,reviewDecision,mergeable,mergeStateStatus,reviews,latestReviews,comments`.
   Confirm the number, open state, non-draft status, `main` base branch, and
   feature branch match the supplied run. Review the latest PR feedback and
   confirm no requested changes remain unresolved. Stop if the PR is closed,
   targets a different branch, has unresolved requested changes, or is not
   mergeable.
4. Read `workflows/<run-id>/spec.md`, `plan.md`, and the complete handoff
   sequence. Confirm the latest approved revisions describe the behavior being
   merged and the latest handoff is a passing `open-pr → human-review` whose
   evidence identifies this PR. If the workflow is blocked, returned, or
   otherwise not at Human Review, resume `$app-feature-workflow` instead of
   cleaning it up.
5. Validate the complete run directory before removing any files:

   ```sh
   pnpm workflow:validate "workflows/<run-id>"
   ```

   Stop on any validation error. The validator verifies handoff order, referenced
   artifacts, and the latest spec and plan approval revisions and digests.
6. Record `git rev-parse HEAD` as the pre-cleanup checkpoint. It is the source
   for restoring the run directory if review reopens before merge.

## Remove the run directory

After readiness and validation pass, remove the whole run directory from the
feature branch:

```sh
git rm -r -- "workflows/<run-id>"
pnpm format
git status --short
```

Review the status. It must contain the intended run-directory removal only; if
formatting or another process changes unrelated files, stop and resolve those
changes without discarding them. Commit the cleanup as a separate conventional
commit with a nonempty prose body, then push it to the PR branch. Record the new
head SHA. Do not edit, amend, or squash earlier stage checkpoint commits.

For example:

```sh
git commit \
  -m "chore(workflow): remove run artifacts before merge" \
  -m "The PR is ready to merge, so its temporary workflow record is removed from the final tree."
git push
```

Keep the commit body about the actual cleanup; never include workflow-step
summaries.

If the PR receives review feedback or CI requests changes after cleanup but
before it is merged, stop finalization. Restore the run directory from the
pre-cleanup checkpoint, commit and push the restoration with the required
workflow handoff, then resume the workflow guide's Verify/Fix or Intake route.
Keep the restored directory on the branch through all further review and
rework. Run this skill again only after the PR is ready.

## Inspect the final PR

After the cleanup commit is pushed:

1. Review the final file list with `gh pr diff --name-only <pr-number>`. It must
   contain no `workflows/<run-id>/` path and no unrelated changes.
2. Read the complete output of `gh pr diff <pr-number>`. Compare every changed
   implementation, test, and durable product-documentation file with the latest
   approved spec and plan. Account for code or documentation changes made while
   the PR was open. Stop if the final diff changes approved behavior without
   returning through the workflow, or contains files outside the feature and
   necessary durable product documentation.
3. Build a conventional squash subject and nonempty prose body from that final
   diff and verified behavior. Follow the commit rules in `AGENTS.md`: use the
   appropriate type and optional lowercase scope, keep the subject under 72
   characters, and explain why the change was needed and what it changes. Keep
   workflow steps, approvals, retries, and PR-description wording out of the
   message.
4. Confirm the final PR head SHA still equals the pushed cleanup commit. Check
   required CI with `gh pr checks <pr-number> --required --watch` and inspect
   `reviewDecision`, `statusCheckRollup`, `mergeable`, and `mergeStateStatus`
   from `gh pr view`. Required checks must pass, any required approval must
   apply to this head, and the PR must remain mergeable. Do not treat skipped,
   pending, or unavailable checks as passing. Stop on failures, missing
   approvals, or a changed head; resolve them through the workflow and repeat
   finalization as needed.

Once these checks pass, show the human the PR number and link, final head SHA,
diff summary, required-check and approval status, and proposed squash subject
and body. Wait for explicit human authorization to squash merge this PR. An
approval of the feature spec, plan, or review alone is not authorization for
this final merge. If authorization is absent or ambiguous, stop before merging.

## Squash merge and verify

After explicit authorization, call `gh pr merge` with the reviewed message,
the exact final head SHA, and squash mode. For example:

```sh
gh pr merge 123 --squash \
  --subject "feat(recipes): add live filters" \
  --body-file /tmp/recipe-vault-merge-message.txt \
  --match-head-commit <final-head-sha>
```

The message file contains only the nonempty prose body. Do not use `--auto`,
`--admin`, another merge mode, or a UI fallback. If the command reports that
the PR is not mergeable, stop and report the reason. If the repository uses a
merge queue, verify the PR actually reaches a merged state; queueing is not
completion.

Verify `gh pr view <pr-number> --json state,mergedAt,mergeCommit` reports a
merge timestamp and merge commit SHA. Fetch `main`, then inspect the squash
commit's changed paths and the resulting `main` tree. Neither may contain
`workflows/<run-id>/`:

```sh
git fetch origin main
git show --pretty=format: --name-only <merge-commit-sha>
git ls-tree -r --name-only origin/main -- "workflows/<run-id>"
```

The second command must list no path under this run directory, and the third
must return no entries. If either check fails or the PR has not actually
merged, report the state and do not claim completion. The merged PR and squash
SHA are the completion record; do not add a per-feature completion handoff,
run directory, or workflow summary to `main`. Keep shared workflow
infrastructure such as the validator and handoff schema.

## References

- [GitHub pull request merge strategies](https://docs.github.com/en/pull-requests/reference/pull-request-merges)
- [`gh pr merge`](https://cli.github.com/manual/gh_pr_merge)
- [`gh pr diff`](https://cli.github.com/manual/gh_pr_diff)
- [`gh pr checks`](https://cli.github.com/manual/gh_pr_checks)
