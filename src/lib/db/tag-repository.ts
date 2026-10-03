import type { SupabaseClient } from "@supabase/supabase-js";

export type TagUsageFilter = "all" | "used" | "unused";
export type TagSortOrder = "name_asc" | "usage_desc" | "usage_asc";
export type TagCursorPosition = {
  usageCount: number;
  name: string;
  id: string;
};
export type TagListOptions = {
  search?: string;
  usage: TagUsageFilter;
  sort: TagSortOrder;
  limit: number;
  after?: TagCursorPosition;
};
export type TagInventoryItem = {
  id: string;
  name: string;
  usageCount: number;
  description?: string;
};
export type TagInventoryPage = { tags: TagInventoryItem[]; hasMore: boolean };

type DatabaseTagInventory = {
  id: string;
  name: string;
  usage_count: number | string;
  description: string | null;
};

/** Owns aggregate tag queries, including the explicit owner filter in the RPC. */
export class TagRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(ownerId: string, options: TagListOptions): Promise<TagInventoryPage> {
    const { data, error } = await this.client.rpc("recipe_vault_list_tag_inventory", {
      target_owner_id: ownerId,
      target_search: options.search || null,
      target_usage: options.usage,
      target_sort: options.sort,
      after_usage_count: options.after?.usageCount ?? null,
      after_name: options.after?.name ?? null,
      after_tag_id: options.after?.id ?? null,
      target_limit: options.limit + 1,
    });
    if (error || !Array.isArray(data)) throw new Error("Could not load tags.");

    const rows = data as DatabaseTagInventory[];
    const tags = rows.slice(0, options.limit).map((row) => {
      const usageCount = Number(row.usage_count);
      if (!Number.isSafeInteger(usageCount) || usageCount < 0)
        throw new Error("Could not load tags.");
      return {
        id: row.id,
        name: row.name,
        usageCount,
        ...(row.description == null ? {} : { description: row.description }),
      };
    });

    return { tags, hasMore: rows.length > options.limit };
  }

  async deleteUnused(ownerId: string, tagId: string): Promise<boolean> {
    const { data, error } = await this.client.rpc("recipe_vault_delete_unused_tag", {
      target_owner_id: ownerId,
      target_tag_id: tagId,
    });
    if (error || typeof data !== "boolean") throw new Error("Could not delete tag.");
    return data;
  }

  async merge(ownerId: string, sourceTagId: string, targetTagId: string): Promise<boolean> {
    const { data, error } = await this.client.rpc("recipe_vault_merge_tags", {
      target_owner_id: ownerId,
      source_tag_id: sourceTagId,
      target_tag_id: targetTagId,
    });
    if (error || typeof data !== "boolean") throw new Error("Could not merge tags.");
    return data;
  }
}
