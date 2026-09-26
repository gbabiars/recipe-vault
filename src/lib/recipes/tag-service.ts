import { z } from "zod";
import type { TagRepository } from "@/lib/db/tag-repository";
import type { RecipeRepository } from "@/lib/db/recipe-repository";
import { tagNameSchema } from "@/lib/validation/recipe";

const pageSchema = z.object({
  search: tagNameSchema.optional(),
  offset: z.number().int().min(0).max(10_000).default(0),
  limit: z.number().int().min(1).max(100).default(25),
});
const recipePageSchema = z.object({
  offset: z.number().int().min(0).max(10_000).default(0),
  limit: z.number().int().min(1).max(100).default(25),
});

export class TagService {
  constructor(
    private readonly tags: TagRepository,
    private readonly recipes: RecipeRepository,
  ) {}

  list(ownerId: string, options: z.input<typeof pageSchema> = {}) {
    const { search, offset, limit } = pageSchema.parse(options);
    return this.tags.list(ownerId, search, offset, limit);
  }

  get(ownerId: string, tagId: string) {
    return this.tags.get(ownerId, z.uuid().parse(tagId));
  }

  create(ownerId: string, name: string) {
    return this.tags.create(ownerId, tagNameSchema.parse(name));
  }

  rename(ownerId: string, tagId: string, name: string) {
    return this.tags.rename(ownerId, z.uuid().parse(tagId), tagNameSchema.parse(name));
  }

  delete(ownerId: string, tagId: string) {
    return this.tags.delete(ownerId, z.uuid().parse(tagId));
  }

  async listRecipes(
    ownerId: string,
    tagId: string,
    options: z.input<typeof recipePageSchema> = {},
  ) {
    const id = z.uuid().parse(tagId);
    const tag = await this.tags.get(ownerId, id);
    if (!tag) return null;
    const { offset, limit } = recipePageSchema.parse(options);
    return this.recipes.listPage(ownerId, undefined, [], [], offset, limit, [id]);
  }
}

/** Binds all future MCP tag operations to the verified owner. */
export class OwnerBoundTagService {
  constructor(
    private readonly ownerId: string,
    private readonly tags: TagService,
  ) {}

  list(options?: Parameters<TagService["list"]>[1]) {
    return this.tags.list(this.ownerId, options);
  }
  get(id: string) {
    return this.tags.get(this.ownerId, id);
  }
  create(name: string) {
    return this.tags.create(this.ownerId, name);
  }
  rename(id: string, name: string) {
    return this.tags.rename(this.ownerId, id, name);
  }
  delete(id: string) {
    return this.tags.delete(this.ownerId, id);
  }
  listRecipes(id: string, options?: Parameters<TagService["listRecipes"]>[2]) {
    return this.tags.listRecipes(this.ownerId, id, options);
  }
}
