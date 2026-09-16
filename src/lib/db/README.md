# Database boundary

`recipe-repository.ts` is the sole application adapter for recipe, ingredient, and step
queries. It accepts the authenticated owner ID explicitly and uses the request-scoped
Supabase client, so every query remains protected by the caller's JWT and database RLS.
Application features must not query Supabase directly.
