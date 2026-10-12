import {
  TagRepository,
  type DocumentTagInventoryOptions,
  type DocumentTagNameReplacementResult,
} from "@/lib/db/tag-repository";
import { tagNameSchema } from "@/lib/validation/recipe";

export type ReplaceDocumentTagNameInput = {
  sourceName: string;
  targetName: string;
};

export class TagService {
  constructor(private readonly tags: TagRepository) {}

  /** Lists names and usage counts derived from the owner's recipe documents. */
  listFromRecipes(ownerId: string, options: DocumentTagInventoryOptions) {
    return this.tags.listFromDocuments(ownerId, options);
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

  listFromRecipes(options: DocumentTagInventoryOptions) {
    return this.tags.listFromRecipes(this.ownerId, options);
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
