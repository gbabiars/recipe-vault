import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { requireUser } from "@/lib/auth/require-user";
import { getRecipeService } from "@/lib/recipes";
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
    <>
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
        <Button type="submit">Filter</Button>
      </form>
      {error ? (
        <Card as="p" className="error-message" role="alert">
          {error}
        </Card>
      ) : recipes.length === 0 ? (
        <Card as="section" padding="large">
          <h2>No recipes found</h2>
          <p>
            {q || tag || dietary
              ? "Try a different search or filter."
              : "Start your private collection with your first recipe."}
          </p>
          <Link href="/recipes/new">Create a recipe</Link>
        </Card>
      ) : (
        <ul className="recipe-list">
          {recipes.map((recipe) => (
            <Card
              as="li"
              key={recipe.id}
              label={`View ${recipe.title}`}
              render={<Link href={`/recipes/${recipe.id}`} />}
            >
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
                  <Chip key={label}>{label}</Chip>
                ))}
              </div>
            </Card>
          ))}
        </ul>
      )}
    </>
  );
}
