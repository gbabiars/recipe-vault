# Recipe feature boundary

This directory contains private recipe UI composition: list cards, detail cards, client forms, and server actions.
Forms convert `FormData` to the canonical validation wire format; pages stay in
`src/app/(private)` and compose these feature components. The route group's layout
owns the shared private shell; its navigation lives in `src/components/app`.

Ingredient forms collect one optional free-text amount alongside the ingredient
name and notes. Edit forms retain free-text amounts such as fractions, ranges,
and phrases such as `to taste`.
