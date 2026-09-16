# Recipe Vault Agent Guide

## Project

Recipe Vault is a private-only recipe application built with Next.js 16, React 19,
TypeScript, and Supabase. This repository is currently Iteration 0: keep the
foundation deployable without adding product behavior that has not been requested.

## Setup and checks

- Use Node.js 20.9 or newer and `pnpm` (pinned to 11.23.0) for dependency and
  script commands.
- Run the narrowest relevant check while working: `pnpm lint`, `pnpm typecheck`,
  `pnpm test`, or `pnpm build`. Run `pnpm check` for changes that span linting,
  types, and tests.
- Add or update focused tests in `tests/` when changing observable behavior.
- Do not hand-edit generated files such as `next-env.d.ts` or `.next/` output.

## Architecture

- Keep route components and route handlers in `src/app` thin. Validate external
  inputs before invoking domain services.
- Put recipe UI and feature composition in `src/features/recipes`.
- Put recipe-domain services, transformations, and authorization policy in
  `src/lib/recipes`.
- Put database repositories and Supabase access adapters in `src/lib/db`.
  Features must not query Supabase directly.
- Put shared validation schemas in `src/lib/validation`.
- Put Supabase browser/server client setup and future auth policy in
  `src/lib/auth`.
- Put the future remote MCP transport and adapters in `src/mcp`; it must reuse
  the web/API authorization and recipe-domain policies.
- Read the `README.md` in the boundary you are changing before adding code there.

## Security and configuration

- Never commit `.env.local`, secrets, or real credentials; use `.env.example`
  only for non-sensitive placeholders.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public
  client configuration. Never expose `SUPABASE_SERVICE_ROLE_KEY` through a
  `NEXT_PUBLIC_*` variable, browser code, logs, responses, or error messages.
- Preserve private-only recipe visibility. Do not guess the sign-in provider,
  owner email, or first MCP client; these are deferred product decisions.

## Change discipline

- Prefer small, scoped changes that preserve existing public behavior unless the
  request explicitly changes it.
- Do not add production dependencies, change deployment configuration, or alter
  authentication policy without a clear task requirement.
- Update `README.md` or the applicable boundary README when a change alters a
  documented contract or ownership boundary.
