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
    for (const label of tags) query = query.contains("tags", [label]);
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

  async create(ownerId: string, input: RecipeCreateInput): Promise<Recipe> {
    const { data: recipe, error } = await this.client
      .from("recipes")
      .insert({ owner_id: ownerId, ...nullableFields(input) })
      .select(selectFields)
      .single();
    if (error || !recipe) throw new Error("Could not create the recipe.");
    const recipeId = (recipe as DatabaseRecipe).id;
    const childRows = [
      ...input.ingredients.map((item) => ({
        recipe_id: recipeId,
        display_order: item.displayOrder,
        quantity: item.quantity,
        unit: item.unit,
        ingredient_name: item.ingredientName,
        notes: item.notes ?? null,
      })),
      ...input.steps.map((item) => ({
        recipe_id: recipeId,
        step_order: item.stepOrder,
        instruction: item.instruction,
        duration_minutes: item.durationMinutes ?? null,
      })),
    ];
    const { error: ingredientError } = await this.client
      .from("recipe_ingredients")
      .insert(childRows.slice(0, input.ingredients.length));
    const { error: stepError } = await this.client
      .from("recipe_steps")
      .insert(childRows.slice(input.ingredients.length));
    if (ingredientError || stepError) {
      await this.client.from("recipes").delete().eq("id", recipeId).eq("owner_id", ownerId);
      throw new Error("Could not save the recipe details.");
    }
    return (await this.get(ownerId, recipeId))!;
  }

  async update(ownerId: string, id: string, input: RecipeCreateInput): Promise<void> {
    const { error } = await this.client
      .from("recipes")
      .update(nullableFields(input))
      .eq("id", id)
      .eq("owner_id", ownerId);
    if (error) throw new Error("Could not update the recipe.");
    const { error: deleteIngredients } = await this.client
      .from("recipe_ingredients")
      .delete()
      .eq("recipe_id", id);
    const { error: deleteSteps } = await this.client
      .from("recipe_steps")
      .delete()
      .eq("recipe_id", id);
    if (deleteIngredients || deleteSteps) throw new Error("Could not update the recipe details.");
    const { error: ingredientError } = await this.client.from("recipe_ingredients").insert(
      input.ingredients.map((item) => ({
        recipe_id: id,
        display_order: item.displayOrder,
        quantity: item.quantity,
        unit: item.unit,
        ingredient_name: item.ingredientName,
        notes: item.notes ?? null,
      })),
    );
    const { error: stepError } = await this.client.from("recipe_steps").insert(
      input.steps.map((item) => ({
        recipe_id: id,
        step_order: item.stepOrder,
        instruction: item.instruction,
        duration_minutes: item.durationMinutes ?? null,
      })),
    );
    if (ingredientError || stepError) throw new Error("Could not update the recipe details.");
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const { error } = await this.client
      .from("recipes")
      .delete()
      .eq("id", id)
      .eq("owner_id", ownerId);
    if (error) throw new Error("Could not delete this recipe.");
  }
}
