import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecipeCreateInput } from "@/lib/validation/recipe";

export type Recipe = {
  id: string;
  ownerId: string;
  title: string;
  summary?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  servings?: number;
  tags: string[];
  dietaryFlags: string[];
  sourceUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
};

export type RecipeIngredient = RecipeCreateInput["ingredients"][number];
export type RecipeStep = RecipeCreateInput["steps"][number];
export type RecipeSummary = Omit<Recipe, "ingredients" | "steps">;
export type RecipePage = { items: RecipeSummary[]; total: number };
export type AuditMetadata = { requestId: string; method: string };

type DatabaseRecipe = {
  id: string;
  owner_id: string;
  title: string;
  summary: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  servings: number | null;
  tags: string[];
  dietary_flags: string[];
  source_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  recipe_ingredients?: Array<{
    display_order: number;
    quantity: number;
    unit: string;
    ingredient_name: string;
    notes: string | null;
  }>;
  recipe_steps?: Array<{
    step_order: number;
    instruction: string;
    duration_minutes: number | null;
  }>;
};

const selectFields =
  "id, owner_id, title, summary, prep_time_minutes, cook_time_minutes, total_time_minutes, servings, tags, dietary_flags, source_url, notes, created_at, updated_at";

function nullableFields(input: Omit<RecipeCreateInput, "ingredients" | "steps">) {
  return {
    title: input.title,
    summary: input.summary ?? null,
    prep_time_minutes: input.prepTimeMinutes ?? null,
    cook_time_minutes: input.cookTimeMinutes ?? null,
    total_time_minutes: input.totalTimeMinutes ?? null,
    servings: input.servings ?? null,
    tags: input.tags,
    dietary_flags: input.dietaryFlags,
    source_url: input.sourceUrl ?? null,
    notes: input.notes ?? null,
  };
}

function mapRecipe(row: DatabaseRecipe): Recipe {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    summary: row.summary ?? undefined,
    prepTimeMinutes: row.prep_time_minutes ?? undefined,
    cookTimeMinutes: row.cook_time_minutes ?? undefined,
    totalTimeMinutes: row.total_time_minutes ?? undefined,
    servings: row.servings ?? undefined,
    tags: row.tags,
    dietaryFlags: row.dietary_flags,
    sourceUrl: row.source_url ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ingredients: (row.recipe_ingredients ?? [])
      .sort((a, b) => a.display_order - b.display_order)
      .map((item) => ({
        displayOrder: item.display_order,
        quantity: item.quantity,
        unit: item.unit,
        ingredientName: item.ingredient_name,
        notes: item.notes ?? undefined,
      })),
    steps: (row.recipe_steps ?? [])
      .sort((a, b) => a.step_order - b.step_order)
      .map((item) => ({
        stepOrder: item.step_order,
        instruction: item.instruction,
        durationMinutes: item.duration_minutes ?? undefined,
      })),
  };
}

/** All operations use the caller's JWT and therefore remain subject to database RLS. */
export class RecipeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(
    ownerId: string,
    search?: string,
    tags: string[] = [],
    dietaryFlags: string[] = [],
  ): Promise<RecipeSummary[]> {
    let query = this.client
      .from("recipes")
      .select(selectFields)
      .eq("owner_id", ownerId)
      .order("updated_at", { ascending: false });
    if (search)
      query = query.ilike("title", `%${search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`);
    if (tags.length) query = query.overlaps("tags", tags);
    for (const dietaryFlag of dietaryFlags) query = query.contains("dietary_flags", [dietaryFlag]);
    const { data, error } = await query;
    if (error) throw new Error("Could not load recipes.");
    return (data as DatabaseRecipe[]).map((row) => {
      const recipe = mapRecipe(row);
      return {
        id: recipe.id,
        ownerId: recipe.ownerId,
        title: recipe.title,
        summary: recipe.summary,
        prepTimeMinutes: recipe.prepTimeMinutes,
        cookTimeMinutes: recipe.cookTimeMinutes,
        totalTimeMinutes: recipe.totalTimeMinutes,
        servings: recipe.servings,
        tags: recipe.tags,
        dietaryFlags: recipe.dietaryFlags,
        sourceUrl: recipe.sourceUrl,
        notes: recipe.notes,
        createdAt: recipe.createdAt,
        updatedAt: recipe.updatedAt,
      };
    });
  }

  async listPage(
    ownerId: string,
    search: string | undefined,
    tags: string[],
    dietaryFlags: string[],
    offset: number,
    limit: number,
    tagIds: string[] = [],
  ): Promise<RecipePage> {
    let query = this.client
      .from("recipes")
      .select(`${selectFields}${tagIds.length ? ", recipe_tags!inner(tag_id)" : ""}`, {
        count: "exact",
      })
      .eq("owner_id", ownerId)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + limit - 1);
    if (search)
      query = query.ilike("title", `%${search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`);
    if (tags.length) query = query.overlaps("tags", tags);
    if (tagIds.length) query = query.in("recipe_tags.tag_id", tagIds);
    for (const flag of dietaryFlags) query = query.contains("dietary_flags", [flag]);
    const { data, error, count } = await query;
    if (error) throw new Error("Could not load recipes.");
    return {
      items: (data as unknown as DatabaseRecipe[]).map((row) => {
        const recipe = mapRecipe(row);
        return {
          id: recipe.id,
          ownerId: recipe.ownerId,
          title: recipe.title,
          summary: recipe.summary,
          prepTimeMinutes: recipe.prepTimeMinutes,
          cookTimeMinutes: recipe.cookTimeMinutes,
          totalTimeMinutes: recipe.totalTimeMinutes,
          servings: recipe.servings,
          tags: recipe.tags,
          dietaryFlags: recipe.dietaryFlags,
          sourceUrl: recipe.sourceUrl,
          notes: recipe.notes,
          createdAt: recipe.createdAt,
          updatedAt: recipe.updatedAt,
        };
      }),
      total: count ?? 0,
    };
  }

  async get(ownerId: string, id: string): Promise<Recipe | null> {
    const { data, error } = await this.client
      .from("recipes")
      .select(
        `${selectFields}, recipe_ingredients(display_order, quantity, unit, ingredient_name, notes), recipe_steps(step_order, instruction, duration_minutes)`,
      )
      .eq("owner_id", ownerId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Could not load this recipe.");
    return data ? mapRecipe(data as DatabaseRecipe) : null;
  }

  private async write(
    ownerId: string,
    id: string | null,
    input: RecipeCreateInput,
  ): Promise<Recipe | null> {
    const { data, error } = await this.client.rpc("recipe_vault_write_recipe", {
      target_owner_id: ownerId,
      target_recipe_id: id,
      recipe_data: nullableFields(input),
      ingredient_data: input.ingredients.map((item) => ({
        display_order: item.displayOrder,
        quantity: item.quantity,
        unit: item.unit,
        ingredient_name: item.ingredientName,
        notes: item.notes ?? null,
      })),
      step_data: input.steps.map((item) => ({
        step_order: item.stepOrder,
        instruction: item.instruction,
        duration_minutes: item.durationMinutes ?? null,
      })),
    });
    if (error)
      throw new Error(id ? "Could not update the recipe." : "Could not create the recipe.");
    return data ? this.get(ownerId, data as string) : null;
  }

  async create(ownerId: string, input: RecipeCreateInput): Promise<Recipe> {
    const recipe = await this.write(ownerId, null, input);
    if (!recipe) throw new Error("Could not create the recipe.");
    return recipe;
  }

  update(ownerId: string, id: string, input: RecipeCreateInput): Promise<Recipe | null> {
    return this.write(ownerId, id, input);
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const { error } = await this.client
      .from("recipes")
      .delete()
      .eq("id", id)
      .eq("owner_id", ownerId);
    if (error) throw new Error("Could not delete this recipe.");
  }

  async recordAudit(
    ownerId: string,
    recipeId: string,
    eventType: string,
    metadata: AuditMetadata,
  ): Promise<void> {
    const { error } = await this.client.rpc("recipe_vault_record_audit_event", {
      target_recipe_id: recipeId,
      target_owner_id: ownerId,
      audit_event_type: eventType,
      audit_event_data: { requestId: metadata.requestId, method: metadata.method, recipeId },
    });
    if (error) throw new Error("Could not record audit event.");
  }
}
