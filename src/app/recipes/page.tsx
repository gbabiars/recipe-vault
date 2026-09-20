import Link from "next/link";
import { ButtonLink } from "@/components/ui/button-link";
import { requireUser } from "@/lib/auth/require-user";
import { getRecipeService } from "@/lib/recipes";
import { RecipeShell } from "@/features/recipes/recipe-shell";
import type { RecipeSummary } from "@/lib/db/recipe-repository";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; dietary?: string }>;
}) {
  const user = await requireUser();
  const { q, tag, dietary } = await searchParams;
  let recipes: RecipeSummary[];
  let error: string | undefined;
  try {
    recipes = await (
      await getRecipeService()
    ).list(user.id, q?.trim(), tag ? [tag] : [], dietary ? [dietary] : []);
  } catch {
    recipes = [];
    error = "Recipes could not be loaded. Refresh the page to try again.";
  }
  return (
    <RecipeShell>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Private collection</p>
          <h1>Your recipes</h1>
        </div>
        <ButtonLink render={<Link href="/recipes/new" />}>Create recipe</ButtonLink>
      </div>
      <form className="filters" method="get">
        <label>
          Search title
          <input name="q" type="search" defaultValue={q} />
        </label>
        <label>
          Tag
          <input name="tag" defaultValue={tag} placeholder="weeknight" />
        </label>
        <label>
          Dietary flag
          <input name="dietary" defaultValue={dietary} placeholder="vegetarian" />
        </label>
        <button type="submit">Filter</button>
      </form>
      {error ? (
        <p className="error-panel" role="alert">
          {error}
        </p>
      ) : recipes.length === 0 ? (
        <section className="empty-state">
          <h2>No recipes found</h2>
          <p>
            {q || tag || dietary
              ? "Try a different search or filter."
              : "Start your private collection with your first recipe."}
          </p>
          <Link href="/recipes/new">Create a recipe</Link>
        </section>
      ) : (
        <ul className="recipe-list">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <Link href={`/recipes/${recipe.id}`}>
                <h2>{recipe.title}</h2>
                {recipe.summary && <p>{recipe.summary}</p>}
                <div className="metadata">
                  {recipe.totalTimeMinutes !== undefined && (
                    <span>{recipe.totalTimeMinutes} min</span>
                  )}
                  <span>
                    Updated{" "}
                    {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                      new Date(recipe.updatedAt),
                    )}
                  </span>
                </div>
                <div className="chips">
                  {[...recipe.tags, ...recipe.dietaryFlags].map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </RecipeShell>
  );
}
