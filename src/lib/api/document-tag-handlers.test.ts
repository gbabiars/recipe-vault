import assert from "node:assert/strict";
import test from "node:test";
import { createRecipeTagApi } from "./document-tag-handlers";

function makeApi(
  options: {
    user?: string | null;
    fail?: boolean;
    tags?: Array<{ name: string; usageCount: number }>;
    hasMore?: boolean;
  } = {},
) {
  const calls: Array<[string, unknown]> = [];
  const api = createRecipeTagApi({
    getUser: async () =>
      options.user === null ? null : { id: options.user ?? "authenticated-owner" },
    getService: async () =>
      ({
        listFromRecipes: async (ownerId: string, query: unknown) => {
          calls.push([ownerId, query]);
          if (options.fail) throw new Error("sensitive database failure");
          return { tags: options.tags ?? [], hasMore: options.hasMore ?? false };
        },
      }) as never,
  });
  return { api, calls };
}

function request(search = "") {
  return new Request(`http://test/api/v1/tags${search}`);
}

test("lists only derived names and usage counts for the authenticated owner", async () => {
  const { api, calls } = makeApi({ tags: [{ name: "weeknight", usageCount: 2 }] });
  const response = await api.list(
    request("?search=%20%20WEEK%20%20night%20&sort=usage_desc&limit=10"),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(calls, [
    ["authenticated-owner", { search: "week night", sort: "usage_desc", limit: 10 }],
  ]);
  assert.deepEqual((await response.json()).data, [{ name: "weeknight", usageCount: 2 }]);
});

test("returns a safe empty inventory and an opaque next cursor", async () => {
  const empty = await makeApi().api.list(request());
  assert.deepEqual((await empty.json()).data, []);

  const { api } = makeApi({ tags: [{ name: "weeknight", usageCount: 3 }], hasMore: true });
  const response = await api.list(request("?sort=usage_desc"));
  const payload = await response.json();
  assert.equal(payload.meta.hasMore, true);
  assert.equal(typeof payload.meta.nextCursor, "string");
  const next = await makeApi().api.list(
    request(`?sort=usage_desc&cursor=${payload.meta.nextCursor}`),
  );
  assert.equal(next.status, 200);
});

test("rejects malformed, incompatible, duplicate, and unknown query parameters", async () => {
  const { api } = makeApi();
  for (const url of [
    "?cursor=%%%",
    `?sort=usage_desc&cursor=${Buffer.from(JSON.stringify({ name: "weeknight" })).toString("base64url")}`,
    "?limit=101",
    "?search=rice&search=beans",
    "?unused=true",
  ]) {
    assert.equal((await api.list(request(url))).status, 422, url);
  }
});

test("binds cursors to normalized search, sort, and authenticated owner", async () => {
  const page = await makeApi({
    tags: [{ name: "weeknight", usageCount: 3 }],
    hasMore: true,
  }).api.list(request("?search=Weeknight&sort=usage_desc"));
  const cursor = (await page.json()).meta.nextCursor as string;

  assert.equal(
    (await makeApi().api.list(request(`?search=weeknight&sort=usage_asc&cursor=${cursor}`))).status,
    422,
  );
  assert.equal(
    (await makeApi().api.list(request(`?search=rice&sort=usage_desc&cursor=${cursor}`))).status,
    422,
  );
  assert.equal(
    (
      await makeApi({ user: "another-owner" }).api.list(
        request(`?search=weeknight&sort=usage_desc&cursor=${cursor}`),
      )
    ).status,
    422,
  );

  // Equivalent normalized searches retain the same cursor context.
  assert.equal(
    (await makeApi().api.list(request(`?search=%20WEEKnight%20&sort=usage_desc&cursor=${cursor}`)))
      .status,
    200,
  );
});

test("requires authentication and returns safe errors for inventory failures", async () => {
  assert.equal((await makeApi({ user: null }).api.list(request())).status, 401);
  const failed = await makeApi({ fail: true }).api.list(request());
  assert.equal(failed.status, 500);
  const payload = await failed.json();
  assert.equal(payload.error.code, "internal_error");
  assert.equal(JSON.stringify(payload).includes("sensitive database failure"), false);
});
