#!/usr/bin/env node
/**
 * Restartable backfill. Default to disposable local Supabase Postgres:
 * RECIPE_VAULT_DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:54322/postgres' pnpm exec tsx scripts/backfill-recipe-documents.ts --batch-size 50
 * Run --refresh-stale to catch up legacy edits, then --reconcile before cutover.
 * Remote writes require both --allow-remote and RECIPE_VAULT_ALLOW_REMOTE=YES;
 * for example, use `RECIPE_VAULT_ALLOW_REMOTE=YES RECIPE_VAULT_DATABASE_URL='postgresql://<user>:<password>@<host>:5432/<database>?sslmode=verify-full&sslrootcert=/path/to/root.crt' pnpm exec tsx scripts/backfill-recipe-documents.ts --allow-remote --refresh-stale` only after an independently reviewed production runbook. Every stderr row is an exception that must be resolved.
 */
import { spawnSync } from "node:child_process";
import { accessSync, constants, statSync } from "node:fs";
import { isAbsolute } from "node:path";
import { convertLegacyRecipeToDocument } from "@/lib/recipes/legacy-document-converter";
import type { Recipe } from "@/lib/db/recipe-repository";

type SourceRow = { recipe: Recipe; snapshot: unknown; document: unknown | null };
type Options = {
  batchSize: number;
  mode: "backfill" | "refresh" | "reconcile";
  recipeId?: string;
  databaseUrl: string;
};

const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 500;
export const PSQL_MAX_BUFFER_BYTES = 64 * 1024 * 1024;

export function parseOptions(
  args: string[],
  databaseUrl = process.env.RECIPE_VAULT_DATABASE_URL,
): Options {
  let batchSize = DEFAULT_BATCH_SIZE;
  let mode: Options["mode"] = "backfill";
  let remoteOptIn = false;
  let recipeId: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--allow-remote") remoteOptIn = true;
    else if (args[index] === "--reconcile") mode = selectMode(mode, "reconcile");
    else if (args[index] === "--refresh-stale") mode = selectMode(mode, "refresh");
    else if (args[index] === "--recipe-id") {
      const candidate = args[index + 1];
      if (!candidate || !isUuid(candidate)) throw new Error("--recipe-id must be a UUID.");
      recipeId = candidate;
      index += 1;
    } else if (args[index] === "--batch-size") {
      const parsed = Number(args[index + 1]);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_BATCH_SIZE) {
        throw new Error(`--batch-size must be an integer from 1 to ${MAX_BATCH_SIZE}.`);
      }
      batchSize = parsed;
      index += 1;
    } else throw new Error(`Unknown option: ${args[index]}`);
  }
  if (!databaseUrl)
    throw new Error("Set RECIPE_VAULT_DATABASE_URL to the local Supabase Postgres URL.");
  const parsedUrl = new URL(databaseUrl);
  if (parsedUrl.protocol !== "postgres:" && parsedUrl.protocol !== "postgresql:") {
    throw new Error("Database URL must use the PostgreSQL protocol.");
  }
  const isLocal =
    (parsedUrl.hostname === "127.0.0.1" ||
      parsedUrl.hostname === "localhost" ||
      parsedUrl.hostname === "[::1]") &&
    parsedUrl.port === "54322";
  if (!isLocal) {
    if (!remoteOptIn || process.env.RECIPE_VAULT_ALLOW_REMOTE !== "YES") {
      throw new Error("Remote Postgres requires --allow-remote and RECIPE_VAULT_ALLOW_REMOTE=YES.");
    }
    const rootCertificate = parsedUrl.searchParams.get("sslrootcert");
    if (parsedUrl.searchParams.get("sslmode") !== "verify-full") {
      throw new Error("Remote Postgres URL must specify sslmode=verify-full.");
    }
    if (!rootCertificate || !isAbsolute(rootCertificate)) {
      throw new Error("Remote Postgres URL must specify an absolute sslrootcert path.");
    }
    try {
      if (!statSync(rootCertificate).isFile()) throw new Error();
      accessSync(rootCertificate, constants.R_OK);
    } catch {
      throw new Error("Remote Postgres sslrootcert must be a readable certificate file.");
    }
  } else if (remoteOptIn) {
    throw new Error("--allow-remote is only valid for an explicitly configured remote endpoint.");
  }
  return { batchSize, mode, ...(recipeId ? { recipeId } : {}), databaseUrl };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
}

function selectMode(current: Options["mode"], requested: Options["mode"]): Options["mode"] {
  if (current !== "backfill" && current !== requested) {
    throw new Error("Choose only one of --reconcile or --refresh-stale.");
  }
  return requested;
}

const snapshotSql = `jsonb_build_object(
  'document', r.document, 'revision', r.revision,
  'recipe', jsonb_build_object(
    'id', r.id::text, 'ownerId', r.owner_id, 'createdAt', r.created_at, 'updatedAt', r.updated_at,
    'title', r.title, 'summary', r.summary,
    'prepTimeMinutes', r.prep_time_minutes, 'cookTimeMinutes', r.cook_time_minutes,
    'totalTimeMinutes', r.total_time_minutes, 'servings', r.servings,
    'tags', to_jsonb(r.tags), 'sourceUrl', r.source_url, 'notes', r.notes,
    'ingredients', coalesce((select jsonb_agg(jsonb_build_object(
      'displayOrder', i.display_order, 'amount', i.amount,
      'ingredientName', i.ingredient_name, 'notes', i.notes
    ) order by i.display_order) from public.recipe_ingredients i where i.recipe_id = r.id), '[]'::jsonb),
    'steps', coalesce((select jsonb_agg(jsonb_build_object(
      'stepOrder', s.step_order, 'instruction', s.instruction,
      'durationMinutes', s.duration_minutes
    ) order by s.step_order) from public.recipe_steps s where s.recipe_id = r.id), '[]'::jsonb)
  ), 'ownerId', r.owner_id, 'createdAt', r.created_at, 'updatedAt', r.updated_at,
  'ingredients', coalesce((select jsonb_agg(jsonb_build_array(i.display_order, i.amount, i.ingredient_name, i.notes) order by i.display_order) from public.recipe_ingredients i where i.recipe_id = r.id), '[]'::jsonb),
  'steps', coalesce((select jsonb_agg(jsonb_build_array(s.step_order, s.instruction, s.duration_minutes) order by s.step_order) from public.recipe_steps s where s.recipe_id = r.id), '[]'::jsonb)
)`;

export function psqlInvocation(
  databaseUrl: string,
  sql: string,
): { args: string[]; env: NodeJS.ProcessEnv } {
  const url = new URL(databaseUrl);
  const args = [
    "--no-psqlrc",
    "--tuples-only",
    "--no-align",
    "--host",
    url.hostname.replace(/^\[|\]$/g, ""),
    "--port",
    url.port,
    "--username",
    decodeURIComponent(url.username),
    "--dbname",
    decodeURIComponent(url.pathname.slice(1)),
    "--set",
    "ON_ERROR_STOP=1",
  ];
  args.push("--command", sql);
  const queryEnvironment = Object.fromEntries(
    [...url.searchParams.entries()].map(([key, value]) => [
      `PG${key.replaceAll("_", "").toUpperCase()}`,
      value,
    ]),
  );
  return {
    args,
    env: {
      ...process.env,
      ...queryEnvironment,
      PGPASSWORD: decodeURIComponent(url.password),
      PGDATABASE: undefined,
      PGHOST: undefined,
      PGPORT: undefined,
      PGUSER: undefined,
    } as NodeJS.ProcessEnv,
  };
}

export function runPsql(databaseUrl: string, sql: string): string {
  const invocation = psqlInvocation(databaseUrl, sql);
  const result = spawnSync("psql", invocation.args, {
    encoding: "utf8",
    maxBuffer: PSQL_MAX_BUFFER_BYTES,
    env: invocation.env,
  });
  if (result.error || result.status !== 0) {
    const code = (result.error as NodeJS.ErrnoException | undefined)?.code;
    const errorName = result.error?.name;
    throw new Error(psqlFailureMessage(code, result.stderr, errorName));
  }
  return result.stdout.trim();
}

export function psqlFailureMessage(
  errorCode: string | undefined,
  stderr: string,
  errorName?: string,
): string {
  if (errorCode === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
    return `Postgres output exceeded ${PSQL_MAX_BUFFER_BYTES} bytes; retry with a smaller --batch-size.`;
  }
  const detail = stderr.match(/ERROR:\s*([^\n]+)/)?.[1] ?? errorName ?? "unknown database error";
  return `Postgres operation failed (${detail}).`;
}

export function sourceQuery(
  afterId: string,
  batchSize: number,
  includeDocuments: boolean,
  recipeId?: string,
): string {
  if (!/^[0-9a-f-]{36}$/i.test(afterId))
    throw new Error("Unexpected recipe identifier from local database.");
  if (recipeId && !isUuid(recipeId)) throw new Error("Unexpected scoped recipe identifier.");
  // Keep scoped runs on the same keyset cursor as unscoped runs. Once the
  // scoped UUID has been processed, the next batch must terminate instead of
  // selecting that UUID again.
  const selection = recipeId
    ? `id = '${recipeId}'::uuid and id > '${afterId}'::uuid`
    : `id > '${afterId}'::uuid`;
  return `select coalesce(jsonb_agg(jsonb_build_object(
    'recipe', jsonb_strip_nulls((${snapshotSql})->'recipe'), 'snapshot', ${snapshotSql}, 'document', r.document
  ) order by r.id), '[]'::jsonb)::text
  from (select * from public.recipes where ${selection} ${includeDocuments ? "" : "and document is null"} order by id limit ${batchSize}) page
  join public.recipes r on r.id = page.id`;
}

function reconstruct(source: unknown): Recipe {
  const row = source as Record<string, unknown>;
  const recipe = row.recipe as Record<string, unknown>;
  const { id, ...rest } = recipe;
  return { id: String(id), ...(rest as Omit<Recipe, "id">) };
}

export function updateSql(
  id: string,
  expectedSnapshot: unknown,
  document: unknown,
  mode: "backfill" | "refresh" = "backfill",
): string {
  if (!/^[0-9a-f-]{36}$/i.test(id))
    throw new Error("Unexpected recipe identifier from local database.");
  const { id: _immutableId, ...documentContent } = document as Record<string, unknown>;
  const payload = JSON.stringify(documentContent);
  const expected = JSON.stringify(expectedSnapshot);
  // Recipe FOR UPDATE blocks FK-backed child/tag associations. Locking the
  // existing child rows additionally serializes direct child edits/deletes.
  return `begin;
select id from public.recipes where id = '${id}'::uuid for update;
select id from public.recipe_ingredients where recipe_id = '${id}'::uuid for update;
select id from public.recipe_steps where recipe_id = '${id}'::uuid for update;
with current as materialized (
  select ${snapshotSql} as snapshot, r.document
  from public.recipes r where r.id = '${id}'::uuid
), changed as (
  update public.recipes r set document = '${payload.replaceAll("'", "''")}'::jsonb
  from current c
  where r.id = '${id}'::uuid
    and c.snapshot = '${expected.replaceAll("'", "''")}'::jsonb
    and r.document is distinct from '${payload.replaceAll("'", "''")}'::jsonb
    ${mode === "backfill" ? "and r.document is null" : ""}
  returning r.id
) select case
  when exists (select 1 from changed) then 'updated'
  when exists (select 1 from current where snapshot = '${expected.replaceAll("'", "''")}'::jsonb) then 'unchanged'
  else 'changed'
end;
commit;
`;
}

function stableJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableJson(child)]),
    );
  }
  return value;
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(stableJson(left)) === JSON.stringify(stableJson(right));
}

export function snapshotMatches(expected: unknown, current: unknown): boolean {
  return sameJson(expected, current);
}

export function classifyWriteOutcome(
  snapshotIsCurrent: boolean,
  documentAlreadyMatches: boolean,
): "updated" | "unchanged" | "changed" {
  if (!snapshotIsCurrent) return "changed";
  return documentAlreadyMatches ? "unchanged" : "updated";
}

export function expectedContent(document: Record<string, unknown>): Record<string, unknown> {
  const { id: _immutableId, ...content } = document;
  return content;
}

export function shouldWriteDocument(
  mode: "backfill" | "refresh" | "reconcile",
  stored: unknown | null,
  expected: unknown,
): boolean {
  if (mode === "reconcile") return false;
  if (mode === "backfill") return stored === null;
  // Refresh intentionally checks every row under locks. A pre-lock equality
  // check could miss a legacy write that is currently uncommitted.
  void stored;
  void expected;
  return true;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  let afterId = "00000000-0000-0000-0000-000000000000";
  let converted = 0;
  let mismatches = 0;
  let refreshed = 0;
  const problems: Array<{ id: string; reason: string }> = [];

  while (true) {
    const raw = runPsql(
      options.databaseUrl,
      sourceQuery(afterId, options.batchSize, options.mode !== "backfill", options.recipeId),
    );
    const rows = JSON.parse(raw || "[]") as SourceRow[];
    if (rows.length === 0) break;
    for (const row of rows) {
      const recipe = reconstruct(row);
      afterId = recipe.id;
      try {
        const expectedDocument = convertLegacyRecipeToDocument(recipe);
        const content = expectedContent(expectedDocument);
        if (options.mode === "reconcile") {
          if (!sameJson(row.document, content)) {
            mismatches += 1;
            problems.push({ id: recipe.id, reason: "document_mismatch" });
          }
          continue;
        }
        if (!shouldWriteDocument(options.mode, row.document, content)) continue;
        const result = runPsql(
          options.databaseUrl,
          updateSql(recipe.id, row.snapshot, expectedDocument, options.mode),
        );
        const status = result
          .trim()
          .split(/\r?\n/)
          .find((line) => /^(updated|unchanged|changed)$/.test(line.trim()))
          ?.trim();
        if (status === "changed" || status === undefined)
          problems.push({ id: recipe.id, reason: "concurrent_change_or_already_written" });
        else if (status === "updated" && row.document === null) converted += 1;
        else if (status === "updated") refreshed += 1;
      } catch {
        problems.push({ id: recipe.id, reason: "conversion_or_write_error" });
      }
    }
  }

  if (options.mode !== "reconcile") {
    const remaining = Number(
      runPsql(
        options.databaseUrl,
        `select count(*) from public.recipes where document is null${options.recipeId ? ` and id = '${options.recipeId}'::uuid` : ""};`,
      ),
    );
    if (remaining > 0) problems.push({ id: "*", reason: `${remaining}_recipes_still_unconverted` });
  }
  // Scoped reconciliation validates only the selected document. Final cutover
  // reconciliation must be unscoped to compare global tag names and counts.
  if (options.mode === "reconcile" && !options.recipeId) {
    const tagMismatches = runPsql(
      options.databaseUrl,
      `with old_tags as (
      select tag.owner_id, tag.name, count(distinct link.recipe_id)::integer as usage_count
      from public.tags tag join public.recipe_tags link on link.tag_id = tag.id and link.owner_id = tag.owner_id
      group by tag.owner_id, tag.name
      having count(distinct link.recipe_id) > 0
    ), document_tags as (
      select recipe.owner_id, names.name, count(distinct recipe.id)::integer as usage_count
      from public.recipes recipe
      cross join lateral jsonb_array_elements_text(coalesce(recipe.document->'tags', '[]'::jsonb)) as names(name)
      group by recipe.owner_id, names.name
    )
    select coalesce(jsonb_agg(jsonb_build_object('ownerId', coalesce(old_tags.owner_id, document_tags.owner_id), 'name', coalesce(old_tags.name, document_tags.name),
      'oldCount', old_tags.usage_count, 'documentCount', document_tags.usage_count)
      order by coalesce(old_tags.name, document_tags.name)), '[]'::jsonb)::text
    from old_tags full join document_tags using (owner_id, name)
    where old_tags.usage_count is distinct from document_tags.usage_count;`,
    );
    const mismatchedTags = JSON.parse(tagMismatches || "[]") as Array<{
      name: string;
      oldCount: number | null;
      documentCount: number | null;
    }>;
    for (const tag of mismatchedTags)
      problems.push({
        id: tag.name,
        reason: `tag_usage_mismatch_old_${tag.oldCount ?? 0}_document_${tag.documentCount ?? 0}`,
      });
    mismatches += mismatchedTags.length;
  }
  for (const problem of problems) process.stderr.write(`${problem.id}\t${problem.reason}\n`);
  process.stdout.write(
    `${options.mode}${options.recipeId ? " (recipe scoped; tag usage not compared)" : ""}: converted=${converted} refreshed=${refreshed} mismatches=${mismatches} exceptions=${problems.length}\n`,
  );
  if (problems.length > 0) process.exitCode = 1;
}

if (process.argv[1]?.endsWith("backfill-recipe-documents.ts")) {
  void main().catch((error: unknown) => {
    const detail = error instanceof Error ? error.message : "unknown error";
    process.stderr.write(`Recipe document backfill failed: ${detail}\n`);
    process.exitCode = 1;
  });
}
