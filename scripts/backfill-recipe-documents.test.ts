import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  classifyWriteOutcome,
  expectedContent,
  parseOptions,
  psqlInvocation,
  psqlFailureMessage,
  resolvePsqlPath,
  PSQL_MAX_BUFFER_BYTES,
  runPsql,
  shouldWriteDocument,
  sourceQuery,
  snapshotMatches,
  updateSql,
} from "./backfill-recipe-documents";

const localUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

test("backfill options default to bounded batches and accept local Supabase only", () => {
  assert.deepEqual(parseOptions([], localUrl), {
    batchSize: 50,
    mode: "backfill",
    databaseUrl: localUrl,
  });
  assert.equal(
    parseOptions(["--recipe-id", "10000000-0000-4000-8000-000000000001"], localUrl).recipeId,
    "10000000-0000-4000-8000-000000000001",
  );
  assert.equal(parseOptions(["--batch-size", "125", "--reconcile"], localUrl).batchSize, 125);
  assert.equal(parseOptions(["--reconcile"], localUrl).mode, "reconcile");
  assert.equal(parseOptions(["--refresh-stale"], localUrl).mode, "refresh");
});

test("backfill refuses remote endpoints and unbounded or malformed batch sizes", () => {
  assert.throws(
    () => parseOptions([], "postgresql://user:pass@example.com:5432/db"),
    /Remote Postgres requires/,
  );
  assert.throws(
    () => parseOptions([], "postgresql://localhost:5432/db"),
    /Remote Postgres requires/,
  );
  assert.throws(() => parseOptions(["--batch-size", "0"], localUrl), /batch-size/);
  assert.throws(() => parseOptions(["--batch-size", "501"], localUrl), /batch-size/);
  assert.throws(() => parseOptions(["--recipe-id", "not-a-uuid"], localUrl), /must be a UUID/);
  assert.throws(() => parseOptions(["--unknown"], localUrl), /Unknown option/);
  assert.throws(
    () => parseOptions(["--refresh-stale", "--reconcile"], localUrl),
    /Choose only one/,
  );
});

test("refresh catches stale documents and is idempotent after a partial run", () => {
  const first = { title: "first" };
  const updatedFirst = { title: "first edited" };
  const second = { title: "second" };
  const documents: Array<Record<string, string> | null> = [null, null];

  // First partial run stopped after the first row.
  assert.equal(shouldWriteDocument("backfill", documents[0], first), true);
  documents[0] = first;
  assert.equal(shouldWriteDocument("backfill", documents[0], first), false);
  assert.equal(shouldWriteDocument("backfill", documents[1], second), true);

  // An old writer changes legacy data after initial conversion. Catch-up
  // replaces the stale document, and a repeated pass becomes a no-op.
  assert.equal(shouldWriteDocument("refresh", documents[0], updatedFirst), true);
  assert.equal(classifyWriteOutcome(true, false), "updated");
  documents[0] = updatedFirst;
  // A rerun checks the locked DB snapshot and classifies an already-current
  // document as unchanged without touching updated_at.
  assert.equal(shouldWriteDocument("refresh", documents[0], updatedFirst), true);
  assert.equal(classifyWriteOutcome(true, true), "unchanged");
  assert.equal(shouldWriteDocument("reconcile", documents[0], second), false);
});

test("a changed snapshot prevents a stale write, with locks covering children", () => {
  const initial = { title: "Soup", ingredients: [[1, "salt"]], steps: [[1, "Stir"]] };
  const concurrentEdit = { title: "Soup", ingredients: [[1, "pepper"]], steps: [[1, "Stir"]] };
  assert.equal(snapshotMatches(initial, initial), true);
  assert.equal(snapshotMatches(initial, concurrentEdit), false);
  assert.equal(classifyWriteOutcome(false, false), "changed");

  const sql = updateSql(
    "10000000-0000-4000-8000-000000000001",
    initial,
    { id: "10000000-0000-4000-8000-000000000001", title: "Soup" },
    "refresh",
  );
  assert.match(sql, /public\.recipes where id = .* for update/);
  assert.match(sql, /public\.recipe_ingredients where recipe_id = .* for update/);
  assert.match(sql, /public\.recipe_steps where recipe_id = .* for update/);
  assert.match(sql, /jsonb_build_object\([\s\S]*?c\.snapshot = .*::jsonb/);
  assert.match(sql, /when exists \(select 1 from changed\) then 'updated'/);
  assert.match(sql, /when exists \(select 1 from current where snapshot = .* then 'unchanged'/);
});

test("documents persisted to JSONB omit immutable row ID and psql output is bounded", () => {
  assert.deepEqual(expectedContent({ id: "recipe-id", title: "Soup" }), { title: "Soup" });
  assert.ok(PSQL_MAX_BUFFER_BYTES > 1_048_576);
  assert.equal(PSQL_MAX_BUFFER_BYTES, 64 * 1024 * 1024);
  assert.match(
    psqlFailureMessage("ERR_CHILD_PROCESS_STDIO_MAXBUFFER", "", "RangeError"),
    /retry with a smaller --batch-size/,
  );
});

test("psql uses an explicitly configured absolute executable, never ambient PATH", () => {
  const directory = mkdtempSync(join(tmpdir(), "recipe-backfill-psql-"));
  const executable = join(directory, "psql");
  writeFileSync(executable, "#!/bin/sh\nexit 0\n");
  chmodSync(executable, 0o755);
  try {
    assert.equal(resolvePsqlPath(executable, []), executable);
    assert.throws(() => resolvePsqlPath("psql", []), /trusted absolute path/);
    assert.throws(() => resolvePsqlPath("", []), /RECIPE_VAULT_PSQL_PATH/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("scoped source queries advance by the keyset cursor and terminate after one recipe", () => {
  const recipeId = "10000000-0000-4000-8000-000000000002";
  const firstBatch = sourceQuery("00000000-0000-0000-0000-000000000000", 50, true, recipeId);
  const nextBatch = sourceQuery(recipeId, 50, true, recipeId);

  assert.match(
    firstBatch,
    /id = '10000000-0000-4000-8000-000000000002'::uuid and id > '00000000-0000-0000-0000-000000000000'::uuid/,
  );
  assert.match(
    nextBatch,
    /id = '10000000-0000-4000-8000-000000000002'::uuid and id > '10000000-0000-4000-8000-000000000002'::uuid/,
  );
});

test("remote targets require two explicit opt-ins and TLS configuration", () => {
  const prior = process.env.RECIPE_VAULT_ALLOW_REMOTE;
  const certDirectory = mkdtempSync(join(tmpdir(), "recipe-backfill-cert-"));
  const rootCert = join(certDirectory, "root.crt");
  writeFileSync(rootCert, "test CA placeholder\n");
  process.env.RECIPE_VAULT_ALLOW_REMOTE = "YES";
  try {
    const remoteUrl = `postgresql://user:secret@db.example.invalid:5432/postgres?sslmode=verify-full&sslrootcert=${encodeURIComponent(rootCert)}`;
    assert.throws(() => parseOptions([], remoteUrl), /--allow-remote/);
    assert.equal(parseOptions(["--allow-remote"], remoteUrl).mode, "backfill");
    assert.throws(
      () =>
        parseOptions(
          ["--allow-remote"],
          "postgresql://user:secret@db.example.invalid:5432/postgres",
        ),
      /sslmode=verify-full/,
    );
    const missingCert = remoteUrl.replace(
      encodeURIComponent(rootCert),
      encodeURIComponent(`${rootCert}.missing`),
    );
    assert.throws(() => parseOptions(["--allow-remote"], missingCert), /readable certificate file/);
    const invocation = psqlInvocation(remoteUrl, "select 1");
    assert.equal(invocation.env.PGSSLMODE, "verify-full");
    assert.equal(invocation.env.PGSSLROOTCERT, rootCert);
    assert.equal(invocation.args.includes("secret"), false);
  } finally {
    if (prior === undefined) delete process.env.RECIPE_VAULT_ALLOW_REMOTE;
    else process.env.RECIPE_VAULT_ALLOW_REMOTE = prior;
    rmSync(certDirectory, { recursive: true, force: true });
  }
});

const integrationDatabaseUrl = process.env.RECIPE_VAULT_DATABASE_URL;
const integrationIsLocal = (() => {
  if (!integrationDatabaseUrl) return false;
  try {
    const url = new URL(integrationDatabaseUrl);
    return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && url.port === "54322";
  } catch {
    return false;
  }
})();

test(
  "local backfill, stale refresh, reconcile, rerun, and concurrent child update",
  {
    skip: integrationIsLocal
      ? false
      : "Set RECIPE_VAULT_DATABASE_URL to disposable local Supabase Postgres.",
  },
  async () => {
    const databaseUrl = integrationDatabaseUrl!;
    const recipeId = randomUUID();
    const ownerId = `recipe-document-test-${randomUUID()}`;
    const unrelatedRecipeId = randomUUID();
    const unrelatedOwnerId = `recipe-document-unrelated-${randomUUID()}`;
    const applicationName = `recipe_backfill_test_${randomUUID().replaceAll("-", "")}`;
    let releaseWriter: (() => Promise<void>) | undefined;
    let stopRunner: (() => Promise<void>) | undefined;

    function scope() {
      return ["--recipe-id", recipeId];
    }

    function cli(...args: string[]) {
      return spawnSync(
        process.execPath,
        ["--import", "tsx", "scripts/backfill-recipe-documents.ts", ...args],
        {
          cwd: process.cwd(),
          encoding: "utf8",
          env: {
            ...process.env,
            RECIPE_VAULT_DATABASE_URL: databaseUrl,
            RECIPE_VAULT_ALLOW_REMOTE: undefined,
          },
          maxBuffer: PSQL_MAX_BUFFER_BYTES,
        },
      );
    }

    try {
      runPsql(
        databaseUrl,
        `insert into public.recipes (id, owner_id, title, tags, servings)
         values ('${recipeId}', '${ownerId}', 'Backfill fixture', array['fixture'], null);
         insert into public.recipe_ingredients (recipe_id, display_order, amount, ingredient_name, notes)
         values ('${recipeId}', 1, '2 cloves', 'garlic', 'minced');
         insert into public.recipe_steps (recipe_id, step_order, instruction, duration_minutes)
         values ('${recipeId}', 1, 'Season gently', 0);
         insert into public.recipes (id, owner_id, title, tags)
         values ('${unrelatedRecipeId}', '${unrelatedOwnerId}', 'Unrelated fixture', '{}'::text[]);
         insert into public.recipe_ingredients (recipe_id, display_order, amount, ingredient_name)
         values ('${unrelatedRecipeId}', 1, '1 cup', 'water');
         insert into public.recipe_steps (recipe_id, step_order, instruction)
         values ('${unrelatedRecipeId}', 1, 'Boil water');`,
      );

      const initial = cli(...scope(), "--batch-size", "1");
      assert.equal(initial.status, 0, initial.stderr);
      assert.match(initial.stdout, /converted=1/);
      assert.equal(
        runPsql(
          databaseUrl,
          `select (document is null)::text from public.recipes where id='${unrelatedRecipeId}'`,
        ),
        "true",
        "Recipe-ID scope must leave unrelated recipes untouched.",
      );
      const initialDocument = JSON.parse(
        runPsql(databaseUrl, `select document::text from public.recipes where id='${recipeId}'`),
      );
      assert.equal("yield" in initialDocument, false);
      assert.equal(initialDocument.instructions[0], "Season gently (Duration: 0 minutes)");

      runPsql(
        databaseUrl,
        `update public.recipes set title='Legacy title edit' where id='${recipeId}';
         update public.recipe_ingredients set ingredient_name='black pepper' where recipe_id='${recipeId}';`,
      );
      const catchUp = cli(...scope(), "--refresh-stale", "--batch-size", "1");
      assert.equal(catchUp.status, 0, catchUp.stderr);
      assert.match(catchUp.stdout, /refreshed=1/);
      const refreshed = JSON.parse(
        runPsql(databaseUrl, `select document::text from public.recipes where id='${recipeId}'`),
      );
      assert.equal(refreshed.title, "Legacy title edit");
      assert.equal(refreshed.ingredients[0].name, "black pepper");

      const writerInvocation = psqlInvocation(databaseUrl, "");
      const writerApplicationName = `recipe_writer_test_${randomUUID().replaceAll("-", "")}`;
      const writer = spawn(resolvePsqlPath(), writerInvocation.args.slice(0, -2), {
        env: { ...writerInvocation.env, PGAPPNAME: writerApplicationName },
        stdio: ["pipe", "pipe", "pipe"],
      });
      releaseWriter = async () => {
        if (writer.exitCode !== null) return;
        const exited = new Promise<void>((resolve) => writer.once("exit", () => resolve()));
        writer.stdin.write("rollback;\n\\q\n");
        await exited;
      };
      writer.stdin.write(
        `begin;\nupdate public.recipe_ingredients set ingredient_name='concurrent cumin' where recipe_id='${recipeId}';\nselect 'WRITER_READY';\n`,
      );
      let writerReady = false;
      for (let attempt = 0; attempt < 200; attempt += 1) {
        writerReady =
          Number(
            runPsql(
              databaseUrl,
              `select count(*) from pg_stat_activity where application_name='${writerApplicationName}' and state='idle in transaction' and query like '%WRITER_READY%'`,
            ),
          ) > 0;
        if (writerReady) break;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      assert.equal(writerReady, true, "Fixture writer did not report its lock-held ready state.");

      const runner = spawn(
        process.execPath,
        [
          "--import",
          "tsx",
          "scripts/backfill-recipe-documents.ts",
          "--refresh-stale",
          ...scope(),
          "--batch-size",
          "1",
        ],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            RECIPE_VAULT_DATABASE_URL: databaseUrl,
            RECIPE_VAULT_ALLOW_REMOTE: undefined,
            PGAPPNAME: applicationName,
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      stopRunner = async () => {
        if (runner.exitCode !== null) return;
        const exited = new Promise<void>((resolve) => runner.once("exit", () => resolve()));
        runner.kill("SIGTERM");
        await exited;
      };
      let runnerStdout = "";
      let runnerStderr = "";
      runner.stdout.setEncoding("utf8").on("data", (chunk: string) => {
        runnerStdout += chunk;
      });
      runner.stderr.setEncoding("utf8").on("data", (chunk: string) => {
        runnerStderr += chunk;
      });

      let sawLockWait = false;
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const waiting = runPsql(
          databaseUrl,
          `select count(*) from pg_stat_activity where application_name='${applicationName}' and wait_event_type='Lock' and query like '%recipe_ingredients%'`,
        );
        if (Number(waiting) > 0) {
          sawLockWait = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      writer.stdin.write("commit;\n\\q\n");
      const [runnerStatus] = await Promise.all([
        new Promise<number>((resolve, reject) => {
          runner.once("error", reject);
          runner.once("exit", (code) => resolve(code ?? -1));
        }),
        new Promise<void>((resolve, reject) => {
          writer.once("error", reject);
          writer.once("exit", (code) =>
            code === 0 ? resolve() : reject(new Error("Fixture writer failed.")),
          );
        }),
      ]);
      releaseWriter = undefined;
      stopRunner = undefined;
      assert.equal(sawLockWait, true, "Runner did not wait on the held child-row lock.");
      assert.notEqual(runnerStatus, 0, runnerStdout);
      assert.match(runnerStderr, /concurrent_change_or_already_written/);

      const recovered = cli(...scope(), "--refresh-stale", "--batch-size", "1");
      assert.equal(recovered.status, 0, recovered.stderr);
      assert.match(recovered.stdout, /refreshed=1/);
      const reconciled = cli(...scope(), "--reconcile", "--batch-size", "1");
      assert.equal(reconciled.status, 0, reconciled.stderr);
      assert.match(reconciled.stdout, /mismatches=0 exceptions=0/);
      assert.match(reconciled.stdout, /recipe scoped; tag usage not compared/);
      const repeatedRefresh = cli(...scope(), "--refresh-stale", "--batch-size", "1");
      assert.equal(repeatedRefresh.status, 0, repeatedRefresh.stderr);
      assert.match(repeatedRefresh.stdout, /refreshed=0/);
    } finally {
      if (releaseWriter) await releaseWriter();
      if (stopRunner) await stopRunner();
      runPsql(
        databaseUrl,
        `delete from public.recipes where id in ('${recipeId}', '${unrelatedRecipeId}');
         delete from public.tags where owner_id in ('${ownerId}', '${unrelatedOwnerId}');`,
      );
    }
  },
);
