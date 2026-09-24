# Recipe feature boundary

This directory contains private recipe UI composition: list cards, client forms, and server actions.
Forms convert `FormData` to the canonical validation wire format; pages stay in
`src/app/(private)` and compose these feature components. The route group's layout
owns the shared private shell; its navigation lives in `src/components/app`.
