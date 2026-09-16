# Recipe library boundary

`recipe-service.ts` provides the recipe command/query surface used by the web UI.
`index.ts` composes it with the request-scoped repository. Future application APIs must
reuse this service rather than reaching into Supabase from routes.
