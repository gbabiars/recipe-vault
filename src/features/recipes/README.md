# Recipe feature boundary

This directory contains the private recipe UI composition: client forms, server actions,
and the shared private sidebar shell. Forms convert `FormData` to the canonical validation
wire format; pages stay in `src/app/(private)` and compose these feature components.
The route group's layout owns the shell so navigation remains visible during loading
and error states. The sidebar marks recipe routes as Recipes and account routes as Settings.
