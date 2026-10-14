# UI accessibility

New and changed UI targets [WCAG 2.2 Level AA](https://www.w3.org/TR/WCAG22/).
This is the product target, not a claim that an automated scan establishes
conformance. Component family guides remain responsible for component-specific
and caller-specific requirements.

## Build accessibly

- Use semantic HTML and meaningful heading and landmark structure. Preserve
  reading order when using layout components.
- Give every control an accessible name. Connect labels, descriptions, and
  errors to the control; do not rely on placeholder text as its only label.
- Make interactive behavior available by keyboard. Keep focus visible, move it
  deliberately for dialogs and menus, and return it to a useful location when
  an interaction closes.
- Make validation results and important asynchronous changes available to
  assistive technology. Pair color with text or another visible cue.
- Use semantic color and focus tokens. Check contrast, focus visibility, zoom
  and reflow, and reduced-motion behavior when a change affects them.

## Choose validation for the change

Storybook runs its accessibility addon as an error-level check. Run affected
stories after UI changes and use interaction tests for behavior such as keyboard
operation, focus handling, labels, and status updates.

Add targeted manual or browser review when the change affects interactive
controls, forms, navigation, overlays, asynchronous feedback, responsive layout,
color, focus styling, or motion. Inspect the behavior that changed: for example,
keyboard order and focus return for an overlay, or reflow at zoom for a changed
layout. Record which checks ran and any remaining limitation. An automated scan
does not cover every WCAG requirement.

Do not add a broad Storybook rule suppression to make a scan pass; keep any
necessary exception specific to the affected story and explain why it is needed.
