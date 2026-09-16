# Recipe library boundary

`recipe-service.ts` provides the ownership-aware recipe command/query surface used by the web UI and `/api/v1`.
`index.ts` composes it with the request-scoped repository. Future application APIs must
reuse this service rather than reaching into Supabase from routes. Updates are patches: the service first obtains the owned recipe, merges the patch, and revalidates the full canonical recipe before persistence.
