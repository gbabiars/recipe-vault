# Agent work standard

Keep the application deployable and add product behavior only when requested.
Do not refactor production components or modules without explicit user
permission. Preserve existing public behavior unless the request explicitly
changes it. Do not add production dependencies, change deployment
configuration, or alter authentication policy without a clear task requirement.

Break plans, implementation prompts, and changes into small iterative steps,
each with one focused outcome and a way to verify it. Prefer narrow vertical
slices; split coupled work horizontally when needed. Keep large cross-cutting
changes out of a single step. Use the
[`feature-slicing` skill](../../.agents/skills/feature-slicing/SKILL.md) when an
approved feature needs smaller implementation steps.

Before asking the user to choose a technical approach, explain the goal and
relevant codebase facts, viable options, a recommendation with its reason, and
the tradeoffs that matter. Show a concise, realistic example for each
materially different option before the choice prompt. Use consuming code for
APIs, JSX for components, or a directory tree or data-flow sketch for a
structural decision.

Whenever proposing or discussing an API, show at least one realistic call
site alongside the recommendation. For UI components, show JSX exercising the
intended composition and important props or states. Compare materially
different shapes with a call site for each, and revise awkward names or
defaults before implementation.

For app features and change reviews, the root agent coordinates the work,
decisions, integration, formatting, and final verification. Reusable agents
own bounded tasks, not a whole feature slice or workflow stage. Use
`workflow_implementer` for assigned implementation and a fresh
`workflow_reviewer` for independent plan verification or code review. The
[feature workflow](../workflows/app-feature.md) defines its own stages and
approval gates and runs only when explicitly invoked.

Use subagents for bounded, independent exploration, documentation research,
diagnosis, or review when parallel work improves the outcome. Keep dependent
decisions and short tasks with the coordinator. Give each subagent a specific
question, relevant boundaries, expected evidence, and a concise result to
return. Give each editing task one owner and explicit file boundaries;
coordinate before editing shared files, generated output, or database state.
Prefer read-only parallel review when work overlaps. For authentication,
ownership, RLS, MCP scopes, or service-role changes, require
`workflow_reviewer` to trace the authorization path before handoff.

Do not hand-edit generated files such as `next-env.d.ts` or `.next/` output.
Report what changed, verification results, and material remaining limits.

Refactors, upgrades, design-system work, and standalone change reviews may
reuse the feature workflow's handoff format and roles, but should have their
own workflow skills and stage rules when repeated. A small self-contained task
can stay with one agent while following the same project checks. For a
standalone diff review, fix the comparison point and provide the originating
request or spec; ask the read-only reviewer for actionable findings with file,
line, failure mode, and evidence.
