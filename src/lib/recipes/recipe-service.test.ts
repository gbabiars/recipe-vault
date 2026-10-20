import assert from "node:assert/strict";
import test from "node:test";
import { OwnerBoundRecipeService, RecipeService } from "./recipe-service";

const documentId = "8c0fb550-686a-4a0c-bf8f-690c1359c877";
const validDocumentContent = {
  title: "Orange shortbread",
  description: "Crisp cookies with orange zest.",
  yield: { amount: 24, unit: "cookies" },
  time: { cookMinutes: 18 },
  ingredients: [{ name: "unsalted butter", amount: "1 cup", note: "softened" }],
  equipment: [{ name: "baking sheet" }],
  instructions: ["Cream the butter and sugar."],
  notes: ["Chill the dough."],
  tags: ["baking"],
  sourceUrl: "https://example.com/shortbread",
};

test("document service forwards owner and revision for read and replacement", async () => {
  const calls: unknown[][] = [];
  const snapshot = { recipe: { id: documentId, ...validDocumentContent }, revision: 4 };
  const repository = {
    getRecipe: async (ownerId: string, id: string) => {
      calls.push(["getRecipe", ownerId, id]);
      return snapshot;
    },
    replaceRecipe: async (ownerId: string, recipe: unknown, revision: number) => {
      calls.push(["replaceRecipe", ownerId, recipe, revision]);
      return { status: "conflict", revision: 5 } as const;
    },
  };
  const service = new RecipeService(repository as never);

  const current = await service.getRecipe("owner-a", documentId);
  assert.deepEqual(current, snapshot);
  const result = await service.replaceRecipe(
    "owner-a",
    { ...current!.recipe, title: "Updated shortbread" },
    current!.revision,
  );

  assert.deepEqual(calls, [
    ["getRecipe", "owner-a", documentId],
    [
      "replaceRecipe",
      "owner-a",
      { id: documentId, ...validDocumentContent, title: "Updated shortbread" },
      4,
    ],
  ]);
  assert.deepEqual(result, { status: "conflict", revision: 5 });
});

test("document list service translates pages into offsets and binds the owner", async () => {
  const calls: unknown[][] = [];
  const page = { items: [], total: 0 };
  const repository = {
    listRecipes: async (
      ownerId: string,
      search: string | undefined,
      tags: string[],
      offset: number,
      limit: number,
      preference?: string,
    ) => {
      calls.push([ownerId, search, tags, offset, limit, preference]);
      return page;
    },
  };
  const service = new RecipeService(repository as never);
  const boundService = new OwnerBoundRecipeService("verified-owner", service);

  assert.deepEqual(
    await boundService.listRecipes({
      search: "rice",
      tags: ["weeknight"],
      page: 3,
      pageSize: 10,
    }),
    page,
  );
  assert.deepEqual(
    await boundService.listRecipes({
      search: "rice",
      preference: "easy-quick",
      tags: ["weeknight"],
      page: 1,
      pageSize: 10,
    }),
    page,
  );
  assert.deepEqual(calls, [
    ["verified-owner", "rice", ["weeknight"], 20, 10, undefined],
    ["verified-owner", "rice", ["weeknight"], 0, 10, "easy-quick"],
  ]);
});

test("document service rejects invalid content before repository writes", async () => {
  let writeCalls = 0;
  const repository = {
    createRecipe: async () => {
      writeCalls++;
      return { status: "saved", recipe: { id: documentId, ...validDocumentContent }, revision: 1 };
    },
    replaceRecipe: async () => {
      writeCalls++;
      return { status: "saved", recipe: { id: documentId, ...validDocumentContent }, revision: 2 };
    },
  };
  const service = new RecipeService(repository as never);

  const createWithClientId = await service.createRecipe("owner-a", {
    id: documentId,
    ...validDocumentContent,
  });
  const replaceWithBadYield = await service.replaceRecipe(
    "owner-a",
    { id: documentId, ...validDocumentContent, yield: { amount: 0, unit: "cookies" } },
    1,
  );
  const replaceWithBadRevision = await service.replaceRecipe(
    "owner-a",
    { id: documentId, ...validDocumentContent },
    0,
  );

  assert.equal(createWithClientId.status, "invalid");
  assert.equal(replaceWithBadYield.status, "invalid");
  assert.equal(replaceWithBadRevision.status, "invalid");
  assert.equal(writeCalls, 0);
});

test("document create forwards validated content and owner and returns saved snapshot", async () => {
  const calls: unknown[][] = [];
  const repository = {
    createRecipe: async (ownerId: string, content: unknown) => {
      calls.push([ownerId, content]);
      return {
        status: "saved",
        recipe: { id: documentId, ...validDocumentContent },
        revision: 1,
      } as const;
    },
  };
  const service = new RecipeService(repository as never);

  const result = await service.createRecipe("owner-a", validDocumentContent);

  assert.deepEqual(calls, [["owner-a", validDocumentContent]]);
  assert.deepEqual(result, {
    status: "saved",
    recipe: { id: documentId, ...validDocumentContent },
    revision: 1,
  });
});

test("saved document create and replacement record owner-bound audit events", async () => {
  const auditCalls: unknown[][] = [];
  const repository = {
    createRecipe: async () => ({
      status: "saved",
      recipe: { id: documentId, ...validDocumentContent },
      revision: 1,
    }),
    replaceRecipe: async (_ownerId: string, recipe: { id: string }) => ({
      status: "saved",
      recipe: { ...recipe, ...validDocumentContent },
      revision: 2,
    }),
    recordAudit: async (...args: unknown[]) => {
      auditCalls.push(args);
    },
  };
  const service = new RecipeService(repository as never);
  const audit = { requestId: "request-123", method: "PUT" };

  const created = await service.createRecipe("owner-a", validDocumentContent, audit);
  const replaced = await service.replaceRecipe(
    "owner-a",
    { id: documentId, ...validDocumentContent, title: "Updated shortbread" },
    1,
    audit,
  );

  assert.equal(created.status, "saved");
  assert.equal(replaced.status, "saved");
  assert.deepEqual(auditCalls, [
    ["owner-a", documentId, "recipe.created", audit],
    ["owner-a", documentId, "recipe.updated", audit],
  ]);
});

test("document invalid, conflict, and not-found outcomes do not record audit events", async () => {
  const auditCalls: unknown[][] = [];
  const outcomes = ["invalid", "conflict", "not_found"] as const;
  let outcomeIndex = 0;
  const document = { id: documentId, ...validDocumentContent };
  const repository = {
    createRecipe: async () => ({ status: "not_found" as const }),
    replaceRecipe: async (_ownerId: string, _recipe: unknown, _revision: number) => ({
      status: outcomes[outcomeIndex++],
    }),
    recordAudit: async (...args: unknown[]) => {
      auditCalls.push(args);
    },
  };
  const service = new RecipeService(repository as never);
  const audit = { requestId: "request-456", method: "PUT" };

  assert.equal(
    (await service.createRecipe("owner-a", validDocumentContent, audit)).status,
    "not_found",
  );
  assert.equal((await service.replaceRecipe("owner-a", document, 1, audit)).status, "invalid");
  assert.equal((await service.replaceRecipe("owner-a", document, 1, audit)).status, "conflict");
  assert.equal((await service.replaceRecipe("owner-a", document, 1, audit)).status, "not_found");
  assert.deepEqual(auditCalls, []);
});

test("document delete forwards owner, revision, and atomic audit metadata without a second audit call", async () => {
  const calls: unknown[][] = [];
  let auditRpcCalls = 0;
  const audit = { requestId: "delete-request", method: "DELETE" };
  const repository = {
    deleteRecipe: async (
      ownerId: string,
      recipeId: string,
      revision: number,
      metadata: typeof audit,
    ) => {
      calls.push([ownerId, recipeId, revision, metadata]);
      return { status: "deleted" as const, recipeId, revision };
    },
    recordAudit: async () => {
      auditRpcCalls++;
    },
  };
  const service = new RecipeService(repository as never);
  const bound = new OwnerBoundRecipeService("verified-owner", service);

  const result = await bound.deleteRecipe(documentId, 5, audit);

  assert.deepEqual(result, { status: "deleted", recipeId: documentId, revision: 5 });
  assert.deepEqual(calls, [["verified-owner", documentId, 5, audit]]);
  assert.equal(auditRpcCalls, 0);
});

test("document delete conflict and missing outcomes do not trigger separate audit writes", async () => {
  let nextResult: { status: "conflict"; revision: number } | { status: "not_found" } = {
    status: "conflict",
    revision: 6,
  };
  let deleteCalls = 0;
  let auditCalls = 0;
  const repository = {
    deleteRecipe: async () => {
      deleteCalls++;
      return nextResult;
    },
    recordAudit: async () => {
      auditCalls++;
    },
  };
  const service = new RecipeService(repository as never);
  const audit = { requestId: "delete-request", method: "DELETE" };

  assert.deepEqual(await service.deleteRecipe("owner-a", documentId, 5, audit), {
    status: "conflict",
    revision: 6,
  });
  nextResult = { status: "not_found" };
  assert.deepEqual(await service.deleteRecipe("owner-a", documentId, 5, audit), {
    status: "not_found",
  });
  assert.deepEqual(await service.deleteRecipe("owner-a", documentId, 0, audit), {
    status: "invalid",
  });
  assert.equal(deleteCalls, 2);
  assert.equal(auditCalls, 0);
});
