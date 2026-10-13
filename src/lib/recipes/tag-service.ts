import {
  TagRepository,
  type TagInventoryOptions,
  type TagNameReplacementResult,
} from "@/lib/db/tag-repository";
import { tagNameSchema } from "@/lib/validation/tag";

export type ReplaceTagNameInput = {
  sourceName: string;
  targetName: string;
};

export class TagService {
  constructor(private readonly tags: TagRepository) {}

  /** Lists names and usage counts derived from the owner's recipe documents. */
  listFromRecipes(ownerId: string, options: TagInventoryOptions) {
    return this.tags.listTags(ownerId, options);
  }

  replaceNameInRecipes(
    ownerId: string,
    input: ReplaceTagNameInput,
  ): Promise<TagNameReplacementResult> {
    const sourceName = parseCanonicalTagName(input.sourceName);
    const targetName = parseCanonicalTagName(input.targetName);
    if (sourceName === targetName) throw new Error("Source and target tags must differ.");
    return this.tags.replaceRecipeTagName(ownerId, sourceName, targetName);
  }
}

/** Binds tag inventory reads to an owner chosen by verified application auth. */
export class OwnerBoundTagService {
  constructor(
    readonly ownerId: string,
    private readonly tags: TagService,
  ) {}

  listFromRecipes(options: TagInventoryOptions) {
    return this.tags.listFromRecipes(this.ownerId, options);
  }

  replaceNameInRecipes(input: ReplaceTagNameInput) {
    return this.tags.replaceNameInRecipes(this.ownerId, input);
  }
}

function parseCanonicalTagName(value: string): string {
  const parsed = tagNameSchema.safeParse(value);
  if (!parsed.success || parsed.data !== value) throw new Error("Invalid canonical tag name.");
  return parsed.data;
}
