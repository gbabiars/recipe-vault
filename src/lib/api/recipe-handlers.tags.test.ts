import assert from "node:assert/strict";
import test from "node:test";
import { RecipeRepository } from "../db/recipe-repository";
import { RecipeService } from "../recipes/recipe-service";
import { createRecipeApi } from "./recipe-handlers";

const tags = [
  ...Array.from({ length: 30 }, (_, index) => ({
    owner: "mine",
    name: `tag ${String(index).padStart(2, "0")}`,
  })),
  { owner: "mine", name: "100% good" },
  { owner: "mine", name: "a_b" },
  { owner: "mine", name: "a\\b" },
  { owner: "other", name: "secret" },
];

function setup(options: { user?: string | null; fail?: boolean; limited?: boolean } = {}) {
  const calls: Array<[string, unknown]> = [];
  const query = {
    select: (field: string) => {
      calls.push(["select", field]);
      return query;
    },
    eq: (field: string, value: string) => {
      calls.push([field, value]);
      return query;
    },
    order: (field: string) => {
      calls.push(["order", field]);
      return query;
    },
    limit: (count: number) => {
      calls.push(["limit", count]);
      return query;
    },
    ilike: (field: string, pattern: string) => {
      calls.push([field, pattern]);
      return query;
    },
    then: (resolve: (value: { data: Array<{ name: string }>; error: Error | null }) => void) => {
      const owner = calls.find(([key]) => key === "owner_id")?.[1];
      const pattern = calls.find(([key]) => key === "name")?.[1] as string | undefined;
      const needle = pattern
        ?.slice(1, -1)
        .replace(/\\([\\%_])/g, "$1")
        .toLowerCase();
      const data = tags
        .filter(
          (tag) => tag.owner === owner && (!needle || tag.name.toLowerCase().includes(needle)),
        )
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 25)
        .map(({ name }) => ({ name }));
      resolve({ data, error: options.fail ? new Error("db unavailable") : null });
    },
  };
  const repository = new RecipeRepository({
    from: (table: string) => {
      calls.push(["from", table]);
      return query;
    },
  } as never);
  const api = createRecipeApi({
    getUser: async () => (options.user === null ? null : { id: options.user ?? "mine" }),
    getService: async () => new RecipeService(repository),
    limiter: {
      check: () =>
        options.limited
          ? { allowed: false, retryAfterSeconds: 10 }
          : { allowed: true, retryAfterSeconds: 0 },
    },
  });
  return { api, calls };
}

const request = (search = "") => new Request(`http://test/api/v1/tags${search}`);

test("tag endpoint uses authentication, validation, rate limit, and safe failures", async () => {
  const publicResponse = (await setup().api.listTags(request()))!;
  assert.equal(publicResponse.headers.get("cache-control"), "private, no-store");
  assert.equal((await setup().api.listTags(request("?search=%20%20")))!.status, 200);
  assert.equal((await setup({ user: null }).api.listTags(request()))!.status, 401);
  assert.equal((await setup({ limited: true }).api.listTags(request()))!.status, 429);
  assert.equal((await setup().api.listTags(request(`?search=${"x".repeat(201)}`)))!.status, 422);
  const failed = (await setup({ fail: true }).api.listTags(request()))!;
  assert.equal(failed.status, 500);
  assert.equal((await failed.json()).error.code, "internal_error");
});
