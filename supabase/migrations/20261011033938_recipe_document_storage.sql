-- Add the document storage alongside the current recipe representation.
-- Existing rows remain NULL until the separately reviewed backfill.

begin;

create extension if not exists pg_jsonschema with schema extensions;

alter table public.recipes
  add column document jsonb,
  add column revision integer not null default 1
    constraint recipes_document_revision_positive_check check (revision > 0),
  add column title_text text generated always as (document ->> 'title') stored;

alter table public.recipes
  add constraint recipes_document_schema_check
  check (
    document is null
    or extensions.jsonb_matches_schema(
      $recipe_document_schema$
      {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "title", "description", "time", "ingredients", "equipment",
          "instructions", "notes", "tags"
        ],
        "properties": {
          "title": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200,
            "pattern": "^\\S(?:[\\s\\S]*\\S)?$"
          },
          "description": { "type": "string", "maxLength": 2000 },
          "yield": {
            "type": "object",
            "additionalProperties": false,
            "required": ["amount", "unit"],
            "properties": {
              "amount": { "type": "number", "exclusiveMinimum": 0 },
              "unit": {
                "type": "string",
                "minLength": 1,
                "maxLength": 64,
                "pattern": "^\\S(?:[\\s\\S]*\\S)?$"
              }
            }
          },
          "time": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "prepMinutes": { "type": "integer", "minimum": 0 },
              "cookMinutes": { "type": "integer", "minimum": 0 },
              "totalMinutes": { "type": "integer", "minimum": 0 }
            }
          },
          "ingredients": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": ["name"],
              "properties": {
                "name": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 200,
                  "pattern": "^\\S(?:[\\s\\S]*\\S)?$"
                },
                "amount": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 128,
                  "pattern": "^\\S(?:[\\s\\S]*\\S)?$"
                },
                "note": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 1000,
                  "pattern": "^\\S(?:[\\s\\S]*\\S)?$"
                }
              }
            }
          },
          "equipment": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": ["name"],
              "properties": {
                "name": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 200,
                  "pattern": "^\\S(?:[\\s\\S]*\\S)?$"
                },
                "note": {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 1000,
                  "pattern": "^\\S(?:[\\s\\S]*\\S)?$"
                }
              }
            }
          },
          "instructions": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "string",
              "minLength": 1,
              "maxLength": 5031,
              "pattern": "^\\S(?:[\\s\\S]*\\S)?$"
            }
          },
          "notes": {
            "type": "array",
            "items": {
              "type": "string",
              "minLength": 1,
              "maxLength": 10000,
              "pattern": "^\\S(?:[\\s\\S]*\\S)?$"
            }
          },
          "tags": {
            "type": "array",
            "maxItems": 32,
            "uniqueItems": true,
            "items": {
              "type": "string",
              "minLength": 1,
              "maxLength": 64,
              "pattern": "^[a-z0-9](?:[a-z0-9_-]| [a-z0-9])*$"
            }
          },
          "sourceUrl": {
            "type": "string",
            "maxLength": 2000,
            "format": "uri",
            "pattern": "^[Hh][Tt][Tt][Pp][Ss]?://[^/?#\\s]+(?:[/?#][^\\s]*)?$"
          }
        }
      }
      $recipe_document_schema$::json,
      document
    )
  );

-- Zod remains the normalization boundary: it trims text fields and canonicalizes
-- tags before writes. The database constraint accepts only that canonical form.
-- JSON Schema's URI format is not the WHATWG URL parser used by Zod, and JSON
-- Schema length counts Unicode code points while JavaScript string length counts
-- UTF-16 code units. The database therefore provides a strict structural guard;
-- exact URL and length semantics remain application-validated.

create index recipes_title_text_trgm_idx
  on public.recipes using gin (title_text gin_trgm_ops);

comment on column public.recipes.document is
  'Nullable during document backfill; stores recipe content without row ID or owner metadata.';
comment on column public.recipes.revision is
  'Optimistic concurrency revision for document writes; starts at 1.';
comment on column public.recipes.title_text is
  'Generated from document.title for targeted title substring search.';

commit;
