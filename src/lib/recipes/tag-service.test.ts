import assert from "node:assert/strict";
import test from "node:test";
import { TagRepository } from "../db/tag-repository";
import { OwnerBoundTagService, TagService } from "./tag-service";

const firstTag = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "dinner",
  usageCount: 4,
};
const secondTag = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "lunch",
  usageCount: 0,
};

test("owner-bound tag service supplies its verified owner to the repository", async () => {
  let requestedOwner: string | undefined;
  const repository = new TagRepository({
    rpc: async (_name: string, args: { target_owner_id: string }) => {
      requestedOwner = args.target_owner_id;
      return { data: [], error: null };
    },
  } as never);
  const service = new OwnerBoundTagService("verified-owner", new TagService(repository));

  await service.list({ usage: "unused", sort: "usage_asc", limit: 25 });
  assert.equal(requestedOwner, "verified-owner");
});

test("owner-bound tag service never accepts an owner from delete input", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const repository = new TagRepository({
    rpc: async (_name: string, args: Record<string, unknown>) => {
      calls.push(args);
      return { data: true, error: null };
    },
  } as never);
  const service = new OwnerBoundTagService("verified-owner", new TagService(repository));

  assert.equal(await service.deleteUnused(secondTag.id), true);
  assert.deepEqual(calls, [{ target_owner_id: "verified-owner", target_tag_id: secondTag.id }]);
});

test("owner-bound tag service binds both merge IDs to its verified owner", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const repository = new TagRepository({
    rpc: async (_name: string, args: Record<string, unknown>) => {
      calls.push(args);
      return { data: true, error: null };
    },
  } as never);
  const service = new OwnerBoundTagService("verified-owner", new TagService(repository));

  assert.equal(await service.merge(firstTag.id, secondTag.id), true);
  assert.deepEqual(calls, [
    {
      target_owner_id: "verified-owner",
      source_tag_id: firstTag.id,
      target_tag_id: secondTag.id,
    },
  ]);
});
