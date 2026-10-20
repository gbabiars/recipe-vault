---
name: ui-accessibility
description: Validate accessibility for changed Recipe Vault UI and report focused automated, browser, and manual checks.
---

# UI accessibility validation

Use this skill when building or reviewing UI whose behavior, semantics, styling,
or layout can affect accessibility. The target for new and changed UI is WCAG
2.2 Level AA. Read the [accessibility standard](../../../docs/standards/ui/accessibility.md)
and the affected component family guides before selecting checks.

## Select checks for the changed behavior

1. Identify what changed: semantic structure, names and labels, keyboard
   interaction, focus, validation, announcements, contrast, zoom/reflow, or
   motion. Do not treat every change as requiring every manual check.
2. For changed stories, run Storybook MCP `test-run`. The configured Storybook
   accessibility addon runs with error severity. Fix actionable violations;
   do not silence a rule broadly to get a passing result.
3. Use focused browser component tests for observable interaction behavior.
   Check keyboard operation, focus movement or return, accessible names, and
   status changes when those behaviors changed. Prefer role- and label-based
   assertions. Add or update a focused test when it is needed to preserve
   changed observable behavior.
4. Add targeted manual or running-app inspection for concerns an automated
   scan cannot settle. Examples include focus order and return for overlays,
   usable layout at zoom, color contrast, and reduced-motion behavior. Inspect
   the actual behavior affected; do not perform an unrelated full-app audit.
5. If a check exposes a meaningful visual or interaction tradeoff, explain the
   finding and options to the user before making a product-level design change.

## Report evidence

State which automated checks, browser tests, and manual inspections ran and
their results. Name relevant checks that were skipped and why. Separate scan
results from manual observations, and do not claim WCAG conformance based only
on Storybook or browser automation.
