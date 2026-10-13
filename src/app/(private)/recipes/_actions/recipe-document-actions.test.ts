import assert from "node:assert/strict";
import test, { mock, before } from "node:test";

if (process.env.RECIPE_DOCUMENT_ACTION_TEST_CHILD === "1") {
  const recipeId = "8c0fb550-686a-4a0c-bf8f-690c1359c877";
  const calls: unknown[][] = [];
  let activeUser: { id: string } | null = { id: "clerk-owner-a" };
  let activeResult: unknown = { status: "saved", recipe: { id: recipeId }, revision: 1 };
  let serviceFailure: Error | null = null;

  const service = {
    createRecipe: async (...args: unknown[]) => {
      calls.push(["createRecipe", ...args]);
      if (serviceFailure) throw serviceFailure;
      return activeResult;
    },
    replaceRecipe: async (...args: unknown[]) => {
      calls.push(["replaceRecipe", ...args]);
      if (serviceFailure) throw serviceFailure;
      return activeResult;
    },
    deleteRecipe: async (...args: unknown[]) => {
      calls.push(["deleteRecipe", ...args]);
      if (serviceFailure) throw serviceFailure;
      return activeResult;
    },
  };

  mock.module("@/lib/auth/require-user", {
    namedExports: {
      requireUser: async () => {
        if (!activeUser) throw new Error("AUTH_REDIRECT");
        return activeUser;
      },
    },
  });
  mock.module("@/lib/recipes", {
    namedExports: { getRecipeService: async () => service },
  });

  let deleteRecipeDocumentAction: (typeof import("./recipe-actions"))["deleteRecipeDocumentAction"];
  let saveRecipeDocumentAction: (typeof import("./recipe-actions"))["saveRecipeDocumentAction"];
  before(async () => {
    ({ deleteRecipeDocumentAction, saveRecipeDocumentAction } = await import("./recipe-actions"));
  });

  const content = {
    title: "Quick pickled onions",
    description: "Tangy onions for tacos and salads.",
    time: { prepMinutes: 10 },
    ingredients: [{ name: "red onion", amount: "1", note: "thinly sliced" }],
    equipment: [{ name: "jar" }],
    instructions: ["Put the onion in the jar."],
    notes: [],
    tags: ["condiments"],
  };

  function assertAuditMetadata(value: unknown, method: string) {
    assert.deepEqual(Object.keys(value as object).sort(), ["method", "requestId"]);
    assert.match((value as { requestId: string }).requestId, /^[0-9a-f-]{36}$/i);
    assert.equal((value as { method: string }).method, method);
    assert.equal("ownerId" in (value as object), false);
    assert.equal("recipe" in (value as object), false);
  }

  test("document actions authenticate, validate, and bind writes to the Clerk owner", async () => {
    calls.length = 0;
    activeUser = { id: "clerk-owner-a" };
    activeResult = { status: "saved", recipe: { id: recipeId }, revision: 1 };

    const result = await saveRecipeDocumentAction(content, {});

    assert.deepEqual(result, { status: "saved" });
    assert.deepEqual(calls[0]?.slice(0, 3), ["createRecipe", "clerk-owner-a", content]);
    assertAuditMetadata(calls[0]?.[3], "SERVER_ACTION_CREATE");
  });

  test("document actions accept an omitted yield", async () => {
    calls.length = 0;
    const result = await saveRecipeDocumentAction(content, {});
    assert.ok(result);
    assert.deepEqual(result, { status: "saved" });
    assert.equal(calls[0]?.[2] && "yield" in (calls[0][2] as object), false);
  });

  test("document replacement carries the authenticated owner and expected revision", async () => {
    calls.length = 0;
    activeResult = { status: "conflict", revision: 8 };
    const result = await saveRecipeDocumentAction(content, {
      recipeId,
      expectedRevision: 7,
    });

    assert.ok(result);
    assert.deepEqual(result, { status: "conflict", revision: 8 });
    assert.deepEqual(calls[0]?.slice(0, 4), [
      "replaceRecipe",
      "clerk-owner-a",
      { ...content, id: recipeId },
      7,
    ]);
    assertAuditMetadata(calls[0]?.[4], "SERVER_ACTION_REPLACE");
  });

  test("document delete requires and forwards the expected revision", async () => {
    calls.length = 0;
    activeResult = { status: "conflict", revision: 4 };
    const result = await deleteRecipeDocumentAction(recipeId, 3);
    assert.ok(result);
    assert.deepEqual(result, { status: "conflict", revision: 4 });
    assert.deepEqual(calls[0]?.slice(0, 4), ["deleteRecipe", "clerk-owner-a", recipeId, 3]);
    assertAuditMetadata(calls[0]?.[4], "SERVER_ACTION_DELETE");
  });

  test("document actions reject caller-supplied ownership before persistence", async () => {
    calls.length = 0;
    const result = await saveRecipeDocumentAction(
      { ...content, ownerId: "attacker" } as typeof content,
      {},
    );
    assert.ok(result);
    assert.equal(result.status, "invalid");
    const invalidContext = await saveRecipeDocumentAction(content, {
      ownerId: "attacker",
    } as never);
    assert.ok(invalidContext);
    assert.equal(invalidContext.status, "invalid");
    assert.deepEqual(calls, []);
  });

  test("document actions redirect unauthenticated callers before touching the service", async () => {
    calls.length = 0;
    activeUser = null;
    await assert.rejects(saveRecipeDocumentAction(content, {}), /AUTH_REDIRECT/);
    await assert.rejects(deleteRecipeDocumentAction(recipeId, 1), /AUTH_REDIRECT/);
    assert.deepEqual(calls, []);
    activeUser = { id: "clerk-owner-a" };
  });

  test("document actions return safe errors for persistence failures", async () => {
    calls.length = 0;
    serviceFailure = new Error("secret database detail");
    const result = await saveRecipeDocumentAction(content, {});
    assert.ok(result);
    assert.deepEqual(result, {
      status: "invalid",
      issues: [{ path: [], message: "Unable to save this recipe. Please try again." }],
    });
    assert.doesNotMatch(JSON.stringify(result), /secret database detail/);
    serviceFailure = null;
  });
} else {
  test("document action behavior", async () => {
    const { spawnSync } = await import("node:child_process");
    const { fileURLToPath } = await import("node:url");
    const { relative } = await import("node:path");
    const testFile = relative(process.cwd(), fileURLToPath(import.meta.url));
    const childEnvironment: NodeJS.ProcessEnv = {
      ...process.env,
      RECIPE_DOCUMENT_ACTION_TEST_CHILD: "1",
    };
    delete childEnvironment["NODE_TEST_CONTEXT"];
    const result = spawnSync(
      process.execPath,
      ["--experimental-test-module-mocks", "--import", "tsx", "--test", testFile],
      { encoding: "utf8", env: childEnvironment },
    );
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /tests 7/);
  });
}
