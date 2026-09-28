import { TagRepository, type TagListOptions } from "@/lib/db/tag-repository";

export class TagService {
  constructor(private readonly tags: TagRepository) {}

  list(ownerId: string, options: TagListOptions) {
    return this.tags.list(ownerId, options);
  }

  deleteUnused(ownerId: string, tagId: string) {
    return this.tags.deleteUnused(ownerId, tagId);
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

  deleteUnused(tagId: string) {
    return this.tags.deleteUnused(this.ownerId, tagId);
  }
}
