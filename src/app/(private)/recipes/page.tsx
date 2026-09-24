import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Field, FieldLabel } from "@/components/ui/field";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
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
          <Heading>Your recipes</Heading>
        </div>
        <ButtonLink variant="primary" render={<Link href="/recipes/new" />}>
          Create recipe
        </ButtonLink>
      </div>
      <form className="filters" method="get">
        <Field name="q">
          <FieldLabel>Search title</FieldLabel>
          <Input type="search" defaultValue={q} />
        </Field>
        <Field name="tag">
          <FieldLabel>Tag</FieldLabel>
          <Input defaultValue={tag} placeholder="weeknight" />
        </Field>
        <Field name="dietary">
          <FieldLabel>Dietary flag</FieldLabel>
          <Input defaultValue={dietary} placeholder="vegetarian" />
        </Field>
        <Button type="submit">Filter</Button>
      </form>
      {error ? (
        <Card as="p" className="error-message" role="alert">
          {error}
        </Card>
      ) : recipes.length === 0 ? (
        <Card as="section" padding="large">
          <Heading as="h2" level={3}>
            No recipes found
          </Heading>
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
              <Heading as="h2" level={5}>
                {recipe.title}
              </Heading>
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
