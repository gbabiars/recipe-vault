import type { SupabaseClient } from "@supabase/supabase-js";

export type Tag = { id: string; name: string; recipeCount: number };
export type TagPage = { items: Tag[]; total: number };

type TagRow = { id: string; name: string; recipe_tags?: [{ count: number }] };

function mapTag(row: TagRow): Tag {
  return { id: row.id, name: row.name, recipeCount: row.recipe_tags?.[0]?.count ?? 0 };
}

/** Every query includes the owner predicate, including for service-role callers. */
export class TagRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(
    ownerId: string,
    search: string | undefined,
    offset: number,
    limit: number,
  ): Promise<TagPage> {
    let query = this.client
      .from("tags")
      .select("id, name, recipe_tags(count)", { count: "exact" })
      .eq("owner_id", ownerId)
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + limit - 1);
    if (search) {
      const escaped = search.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
      query = query.ilike("name", `%${escaped}%`);
    }
    const { data, error, count } = await query;
    if (error) throw new Error("Could not load tags.");
    return { items: (data as TagRow[]).map(mapTag), total: count ?? 0 };
  }

  async get(ownerId: string, id: string): Promise<Tag | null> {
    const { data, error } = await this.client
      .from("tags")
      .select("id, name, recipe_tags(count)")
      .eq("owner_id", ownerId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Could not load this tag.");
    return data ? mapTag(data as TagRow) : null;
  }

  async create(ownerId: string, name: string): Promise<Tag> {
    const { error } = await this.client
      .from("tags")
      .upsert({ owner_id: ownerId, name }, { onConflict: "owner_id,name", ignoreDuplicates: true });
    if (error) throw new Error("Could not create this tag.");
    const { data, error: lookupError } = await this.client
      .from("tags")
      .select("id, name, recipe_tags(count)")
      .eq("owner_id", ownerId)
      .eq("name", name)
      .single();
    if (lookupError || !data) throw new Error("Could not load this tag.");
    return mapTag(data as TagRow);
  }

  async rename(
    ownerId: string,
    id: string,
    name: string,
  ): Promise<{ status: "renamed"; tag: Tag } | { status: "not_found" | "conflict" }> {
    const { data, error } = await this.client
      .from("tags")
      .update({ name })
      .eq("owner_id", ownerId)
      .eq("id", id)
      .select("id");
    if (error?.code === "23505") return { status: "conflict" };
    if (error) throw new Error("Could not rename this tag.");
    if (!data?.length) return { status: "not_found" };
    const tag = await this.get(ownerId, id);
    if (!tag) throw new Error("Could not load this tag.");
    return { status: "renamed", tag };
  }

  async delete(ownerId: string, id: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("tags")
      .delete()
      .eq("owner_id", ownerId)
      .eq("id", id)
      .select("id");
    if (error) throw new Error("Could not delete this tag.");
    return Boolean(data?.length);
  }
}
