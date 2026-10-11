import {
  TagRepository,
  type DocumentTagInventoryOptions,
  type TagListOptions,
  type DocumentTagNameReplacementResult,
} from "@/lib/db/tag-repository";
import { tagNameSchema } from "@/lib/validation/recipe";

export type ReplaceDocumentTagNameInput = {
  sourceName: string;
  targetName: string;
};

export class TagService {
  constructor(private readonly tags: TagRepository) {}

  list(ownerId: string, options: TagListOptions) {
    return this.tags.list(ownerId, options);
  }

  /** Lists names and usage counts derived from the owner's recipe documents. */
  listFromRecipes(ownerId: string, options: DocumentTagInventoryOptions) {
    return this.tags.listFromDocuments(ownerId, options);
  }

  deleteUnused(ownerId: string, tagId: string) {
    return this.tags.deleteUnused(ownerId, tagId);
  }

  merge(ownerId: string, sourceTagId: string, targetTagId: string) {
    return this.tags.merge(ownerId, sourceTagId, targetTagId);
  }

  replaceNameInRecipes(
    ownerId: string,
    input: ReplaceDocumentTagNameInput,
  ): Promise<DocumentTagNameReplacementResult> {
    const sourceName = parseCanonicalTagName(input.sourceName);
    const targetName = parseCanonicalTagName(input.targetName);
    if (sourceName === targetName) throw new Error("Source and target tags must differ.");
    return this.tags.replaceDocumentTagName(ownerId, sourceName, targetName);
  }
}

/** Binds tag inventory reads to an owner chosen by verified application auth. */
export class OwnerBoundTagService {
  constructor(
    readonly ownerId: string,
    private readonly tags: TagService,
  ) {}

  list(options: TagListOptions) {
    return this.tags.list(this.ownerId, options);
  }

  listFromRecipes(options: DocumentTagInventoryOptions) {
    return this.tags.listFromRecipes(this.ownerId, options);
  }

  deleteUnused(tagId: string) {
    return this.tags.deleteUnused(this.ownerId, tagId);
  }

  merge(sourceTagId: string, targetTagId: string) {
    return this.tags.merge(this.ownerId, sourceTagId, targetTagId);
  }

  replaceNameInRecipes(input: ReplaceDocumentTagNameInput) {
    return this.tags.replaceNameInRecipes(this.ownerId, input);
  }
}

function parseCanonicalTagName(value: string): string {
  const parsed = tagNameSchema.safeParse(value);
  if (!parsed.success || parsed.data !== value) throw new Error("Invalid canonical tag name.");
  return parsed.data;
}
