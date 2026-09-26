# Recipe library boundary

`recipe-service.ts` provides the ownership-aware recipe command/query surface used by the web UI and `/api/v1`.
`index.ts` composes it with the request-scoped repository. Future application APIs must
reuse this service rather than reaching into Supabase from routes. Updates are patches: the service first obtains the owned recipe, merges the patch, and revalidates the full canonical recipe before persistence.

Recipe tag names are canonical lowercase ASCII with surrounding whitespace
removed and repeated internal ASCII spaces collapsed to one. The recipe input
schema removes duplicates after normalization. Tags with distinct canonical
names remain distinct; dietary flags stay separate. The database applies the
same tag rule to legacy array writes and existing data during backfill.

Recipe listing filters by canonical tag name. The tag catalog has no application
service until a recipe workflow needs catalog operations.
