---
name: feature-slicing
description: Break an approved Recipe Vault feature plan into small, independently verifiable implementation steps across affected boundaries.
metadata:
  short-description: Decompose feature implementation
---

# Feature slicing

Use after the app feature specification and plan are approved, or when a
requested feature needs decomposition. Define each slice by one observable
outcome, affected callers, owner and privacy rules, and focused verification.
Read the relevant boundary READMEs. Show a realistic consuming call site before
adding a service or component interface. Assign one owner to each edited file,
and integrate shared contracts before parallel implementation. Preserve the
approved behavior; route a product change back through the feature workflow's
Intake gate.
