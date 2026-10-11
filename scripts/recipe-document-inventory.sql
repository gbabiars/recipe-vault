-- Read-only inventory for implementation-plan step 1.
--
-- Run only against a local/disposable Supabase database that has all committed
-- migrations applied. Start the local stack, set LOCAL_SUPABASE_DB_URL to its
-- local PostgreSQL connection string, then run:
--   psql "$LOCAL_SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 \
--     -f scripts/recipe-document-inventory.sql
-- Do not point this script at a hosted/remote database. The URL and query output
-- are never printed by the script. The transaction is explicitly read-only and
-- is rolled back after collecting one consistent snapshot.
--
-- Each result row reports a category, row count, and UUIDs only. Recipe and tag
-- content, owner IDs, credentials, and connection details are not selected.
-- A category with no result row has a count of zero.
-- Some categories are informational (for example, missing yield and existing
-- durations); `document_*` categories identify values needing review before a
-- document backfill. Existing CHECK constraints should make several findings
-- impossible, but the checks are retained to detect historical constraint or
-- migration drift.

\set ON_ERROR_STOP on
\echo 'Recipe document migration inventory (read-only; UUIDs only)'

begin transaction read only;

with issue_rows(category, record_id) as (
  -- Yield and step migration inventory.
  select 'yield_missing', recipe.id from public.recipes as recipe where recipe.servings is null
  union all
  select 'yield_nonpositive', recipe.id from public.recipes as recipe where recipe.servings <= 0
  union all
  select 'step_has_duration', step.id from public.recipe_steps as step where step.duration_minutes is not null
  union all
  select 'recipe_missing_ingredients', recipe.id
  from public.recipes as recipe
  where not exists (
    select 1 from public.recipe_ingredients as ingredient where ingredient.recipe_id = recipe.id
  )
  union all
  select 'recipe_missing_steps', recipe.id
  from public.recipes as recipe
  where not exists (
    select 1 from public.recipe_steps as step where step.recipe_id = recipe.id
  )

  -- Legacy tag validation, normalization, duplicate links, and metadata archive.
  union all
  select 'invalid_recipe_tag_name', recipe.id
  from public.recipes as recipe
  cross join lateral unnest(recipe.tags) as tag_item(name)
  where public.recipe_vault_valid_labels(array[tag_item.name]) is not true
     or public.recipe_vault_canonical_tag_name(tag_item.name) is distinct from tag_item.name
  union all
  select 'duplicate_recipe_tag_name', recipe.id
  from public.recipes as recipe
  cross join lateral unnest(recipe.tags) as tag_item(name)
  group by recipe.id, public.recipe_vault_canonical_tag_name(tag_item.name)
  having count(*) > 1
  union all
  select 'duplicate_recipe_tag_association_name', link.recipe_id
  from public.recipe_tags as link
  join public.tags as tag on tag.id = link.tag_id and tag.owner_id = link.owner_id
  group by link.recipe_id, public.recipe_vault_canonical_tag_name(tag.name)
  having count(*) > 1
  union all
  select 'invalid_tag_catalog_name', tag.id
  from public.tags as tag
  where public.recipe_vault_valid_labels(array[tag.name]) is not true
     or public.recipe_vault_canonical_tag_name(tag.name) is distinct from tag.name
  union all
  select 'tag_has_description_archive_required', tag.id
  from public.tags as tag
  where tag.description is not null
  union all
  select 'unused_tag_archive_required', tag.id
  from public.tags as tag
  where not exists (
    select 1 from public.recipe_tags as link where link.tag_id = tag.id
  )
  union all
  select 'recipe_tag_projection_mismatch', recipe.id
  from public.recipes as recipe
  where coalesce((
      select array_agg(tag.name order by tag.name)
      from public.recipe_tags as link
      join public.tags as tag on tag.id = link.tag_id and tag.owner_id = link.owner_id
      where link.recipe_id = recipe.id
    ), '{}'::text[]) is distinct from (
      select coalesce(array_agg(tag_name order by tag_name), '{}'::text[])
      from unnest(recipe.tags) as tag_item(tag_name)
    )

  -- Values that merit review against the agreed RecipeDocument constraints.
  union all
  select 'document_title_invalid', recipe.id
  from public.recipes as recipe
  where char_length(btrim(recipe.title)) not between 1 and 200
  union all
  select 'document_description_too_long', recipe.id
  from public.recipes as recipe
  where recipe.summary is not null and char_length(recipe.summary) > 2_000
  union all
  select 'document_time_negative', recipe.id
  from public.recipes as recipe
  where recipe.prep_time_minutes < 0
     or recipe.cook_time_minutes < 0
     or recipe.total_time_minutes < 0
  union all
  select 'document_recipe_note_invalid', recipe.id
  from public.recipes as recipe
  where recipe.notes is not null
    and (char_length(btrim(recipe.notes)) not between 1 and 10_000)
  union all
  select 'document_too_many_tags', recipe.id
  from public.recipes as recipe
  where cardinality(recipe.tags) > 32
  union all
  select 'document_source_url_invalid', recipe.id
  from public.recipes as recipe
  where recipe.source_url is not null
    and (char_length(recipe.source_url) > 2_000
      or recipe.source_url !~* '^https?://[^[:space:]]+$')
  union all
  select 'document_ingredient_invalid', ingredient.recipe_id
  from public.recipe_ingredients as ingredient
  where char_length(btrim(ingredient.ingredient_name)) not between 1 and 200
     or (ingredient.amount is not null and
         (ingredient.amount <> btrim(ingredient.amount)
          or char_length(ingredient.amount) not between 1 and 128))
     or (ingredient.notes is not null and
         char_length(btrim(ingredient.notes)) not between 1 and 1_000)
  union all
  select 'document_instruction_invalid', step.recipe_id
  from public.recipe_steps as step
  where char_length(btrim(step.instruction)) not between 1 and 5_000
)
select
  category,
  count(distinct record_id) as row_count,
  array_agg(distinct record_id order by record_id) as record_ids
from issue_rows
group by category
order by category;

-- A read-only transaction prevents accidental edits if this file is extended
-- later; rollback also makes the no-write intent explicit.
rollback;
