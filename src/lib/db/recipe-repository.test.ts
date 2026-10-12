import assert from "node:assert/strict";
import test from "node:test";
import type { RecipeDocumentContent } from "../validation/recipe-document";
import { RecipeRepository } from "./recipe-repository";

const documentId = "8c0fb550-686a-4a0c-bf8f-690c1359c877";
const recipeContent: RecipeDocumentContent = {
  title: "Orange shortbread",
  description: "Crisp cookies with orange zest.",
  yield: { amount: 24, unit: "cookies" },
  time: { cookMinutes: 18 },
  ingredients: [{ name: "unsalted butter", amount: "1 cup", note: "softened" }],
  equipment: [{ name: "baking sheet" }],
  instructions: ["Cream the butter and sugar."],
  notes: ["Chill the dough."],
  tags: ["baking", "cookies"],
  sourceUrl: "https://example.com/shortbread",
};

function rpcSavedDocument(revision = 3) {
  return {
    status: "saved",
    recipe_id: documentId,
    revision,
    document: recipeContent,
  };
}

test("document reads assemble the row ID and revision while scoping by owner", async () => {
  const calls: Array<[string, ...unknown[]]> = [];
  const query = {
    select: (fields: string) => {
      calls.push(["select", fields]);
      return query;
    },
    eq: (field: string, value: string) => {
      calls.push(["eq", field, value]);
      return query;
    },
    maybeSingle: async () => ({
      data: { id: documentId, document: recipeContent, revision: 7 },
      error: null,
    }),
  };
  const repository = new RecipeRepository({ from: () => query } as never);

  const current = await repository.getDocument("owner-a", documentId);

  assert.deepEqual(calls, [
    ["select", "id, document, revision"],
    ["eq", "owner_id", "owner-a"],
    ["eq", "id", documentId],
  ]);
  assert.deepEqual(current, {
    recipe: { id: documentId, ...recipeContent },
    revision: 7,
  });
});

test("document list summaries use the owner-scoped search RPC and validate its page", async () => {
  let rpcCall: { name: string; args: Record<string, unknown> } | undefined;
  const repository = new RecipeRepository({
    rpc: async (name: string, args: Record<string, unknown>) => {
      rpcCall = { name, args };
      return {
        data: {
          items: [
            {
              id: documentId,
              document: recipeContent,
              revision: 4,
              created_at: "created",
              updated_at: "updated",
            },
          ],
          total: 1,
        },
        error: null,
      };
    },
  } as never);

  const page = await repository.listDocumentPage(
    "owner-a",
    "rice%_\\",
    ["weeknight dinner", "baking"],
    10,
    25,
  );

  assert.deepEqual(rpcCall, {
    name: "recipe_vault_search_recipe_documents",
    args: {
      target_owner_id: "owner-a",
      target_search: "rice%_\\",
      target_tags: ["weeknight dinner", "baking"],
      target_offset: 10,
      target_limit: 25,
    },
  });
  assert.deepEqual(page, {
    items: [
      {
        id: documentId,
        title: recipeContent.title,
        description: recipeContent.description,
        yield: recipeContent.yield,
        time: recipeContent.time,
        tags: recipeContent.tags,
        revision: 4,
        createdAt: "created",
        updatedAt: "updated",
      },
    ],
    total: 1,
  });
});

test("document list summaries preserve omitted yields and reject malformed documents", async () => {
  function makeClient(document: unknown, revision: number, total: unknown = 1) {
    return {
      rpc: async () => ({
        data: {
          items: [
            { id: documentId, document, revision, created_at: "created", updated_at: "updated" },
          ],
          total,
        },
        error: null,
      }),
    };
  }
  const noYieldContent = { ...recipeContent };
  delete noYieldContent.yield;
  const repository = new RecipeRepository(makeClient(noYieldContent, 1) as never);
  const page = await repository.listDocumentPage("owner-a", undefined, [], 0, 25);
  assert.equal("yield" in page.items[0], false);

  const malformedRepository = new RecipeRepository({
    rpc: async () => ({
      data: {
        items: [
          {
            id: documentId,
            document: { ...recipeContent, title: "" },
            revision: 1,
            created_at: "created",
            updated_at: "updated",
          },
        ],
        total: 1,
      },
      error: null,
    }),
  } as never);
  await assert.rejects(malformedRepository.listDocumentPage("owner-a", undefined, [], 0, 25));

  const invalidRevisionRepository = new RecipeRepository({
    rpc: async () => ({
      data: {
        items: [
          {
            id: documentId,
            document: recipeContent,
            revision: 0,
            created_at: "created",
            updated_at: "updated",
          },
        ],
        total: 1,
      },
      error: null,
    }),
  } as never);
  await assert.rejects(invalidRevisionRepository.listDocumentPage("owner-a", undefined, [], 0, 25));

  const invalidCountRepository = new RecipeRepository({
    rpc: async () => ({ data: { items: [], total: -1 }, error: null }),
  } as never);
  await assert.rejects(invalidCountRepository.listDocumentPage("owner-a", undefined, [], 0, 25));
});

test("document create sends id-free content and owner to the atomic RPC", async () => {
  let rpcCall: { name: string; args: Record<string, unknown> } | undefined;
  const repository = new RecipeRepository({
    rpc: async (name: string, args: Record<string, unknown>) => {
      rpcCall = { name, args };
      return { data: [rpcSavedDocument(1)], error: null };
    },
  } as never);

  const result = await repository.createDocument("owner-a", recipeContent);

  assert.deepEqual(rpcCall, {
    name: "recipe_vault_write_recipe_document",
    args: {
      target_owner_id: "owner-a",
      target_recipe_id: null,
      target_expected_revision: null,
      target_document: recipeContent,
    },
  });
  assert.equal("id" in (rpcCall?.args.target_document as object), false);
  assert.deepEqual(result, {
    status: "saved",
    recipe: { id: documentId, ...recipeContent },
    revision: 1,
  });
});

test("document replacement sends the immutable row ID and expected revision", async () => {
  let rpcArgs: Record<string, unknown> | undefined;
  const repository = new RecipeRepository({
    rpc: async (_name: string, args: Record<string, unknown>) => {
      rpcArgs = args;
      return { data: [{ ...rpcSavedDocument(9), status: "conflict" }], error: null };
    },
  } as never);

  const recipe = { id: documentId, ...recipeContent };
  const result = await repository.replaceDocument("owner-a", recipe, 8);

  assert.deepEqual(rpcArgs, {
    target_owner_id: "owner-a",
    target_recipe_id: documentId,
    target_expected_revision: 8,
    target_document: recipeContent,
  });
  assert.deepEqual(result, { status: "conflict", revision: 9 });
});

test("document write preserves explicit not-found and invalid outcomes", async () => {
  const repository = new RecipeRepository({
    rpc: async (_name: string, args: { target_recipe_id: string | null }) => ({
      data: [
        args.target_recipe_id === null
          ? { status: "invalid", recipe_id: null, revision: null, document: null }
          : { status: "not_found", recipe_id: null, revision: null, document: null },
      ],
      error: null,
    }),
  } as never);

  assert.deepEqual(await repository.createDocument("owner-a", recipeContent), {
    status: "invalid",
  });
  assert.deepEqual(
    await repository.replaceDocument("owner-a", { id: documentId, ...recipeContent }, 1),
    { status: "not_found" },
  );
});

test("document delete binds owner, recipe, revision, and optional audit metadata", async () => {
  let call: { name: string; args: Record<string, unknown> } | undefined;
  const repository = new RecipeRepository({
    rpc: async (name: string, args: Record<string, unknown>) => {
      call = { name, args };
      return {
        data: [{ status: "deleted", recipe_id: documentId, revision: 4 }],
        error: null,
      };
    },
  } as never);
  const audit = { requestId: "request-123", method: "DELETE" };

  const result = await repository.deleteDocument("owner-a", documentId, 4, audit);

  assert.deepEqual(call, {
    name: "recipe_vault_delete_recipe_document",
    args: {
      target_owner_id: "owner-a",
      target_recipe_id: documentId,
      target_expected_revision: 4,
      target_audit_request_id: "request-123",
      target_audit_method: "DELETE",
    },
  });
  assert.deepEqual(result, { status: "deleted", recipeId: documentId, revision: 4 });
});

test("document delete preserves conflict, missing, and invalid outcomes", async () => {
  let outcome: Record<string, unknown> = { status: "conflict", revision: 7 };
  const repository = new RecipeRepository({
    rpc: async () => ({ data: [outcome], error: null }),
  } as never);

  assert.deepEqual(await repository.deleteDocument("owner-a", documentId, 6), {
    status: "conflict",
    revision: 7,
  });
  outcome = { status: "not_found", recipe_id: null, revision: null };
  assert.deepEqual(await repository.deleteDocument("owner-a", documentId, 6), {
    status: "not_found",
  });
  outcome = { status: "invalid", recipe_id: null, revision: null };
  assert.deepEqual(await repository.deleteDocument("owner-a", documentId, 0), {
    status: "invalid",
  });
});

test("document delete rejects malformed RPC results and hides database errors", async () => {
  const invalidRepository = new RecipeRepository({
    rpc: async () => ({
      data: [{ status: "deleted", recipe_id: "another-id", revision: 4 }],
      error: null,
    }),
  } as never);
  await assert.rejects(invalidRepository.deleteDocument("owner-a", documentId, 4));

  const failedRepository = new RecipeRepository({
    rpc: async () => ({ data: null, error: new Error("sensitive database detail") }),
  } as never);
  await assert.rejects(failedRepository.deleteDocument("owner-a", documentId, 4), {
    message: "Could not delete this recipe.",
  });
});
