import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Heading } from "@/components/ui/heading";
import { requireUser } from "@/lib/auth/require-user";
import { getRecipeService } from "@/lib/recipes";
import { DeleteRecipeForm } from "@/features/recipes/delete-recipe-form";
export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const recipe = await (await getRecipeService()).get(user.id, id);
  if (!recipe) notFound();
  return (
    <>
      <div className="page-heading">
        <div>
          <Link href="/recipes">← All recipes</Link>
          <Heading>{recipe.title}</Heading>
          {recipe.summary && <p className="lead">{recipe.summary}</p>}
        </div>
        <ButtonLink render={<Link href={`/recipes/${recipe.id}/edit`} />}>Edit recipe</ButtonLink>
      </div>
      <div className="recipe-detail">
        <Card as="section">
          <Heading as="h2" level={5}>
            Details
          </Heading>
          <dl>
            {recipe.servings !== undefined && (
              <>
                <dt>Servings</dt>
                <dd>{recipe.servings}</dd>
              </>
            )}
            {recipe.prepTimeMinutes !== undefined && (
              <>
                <dt>Prep</dt>
                <dd>{recipe.prepTimeMinutes} minutes</dd>
              </>
            )}
            {recipe.cookTimeMinutes !== undefined && (
              <>
                <dt>Cook</dt>
                <dd>{recipe.cookTimeMinutes} minutes</dd>
              </>
            )}
            {recipe.totalTimeMinutes !== undefined && (
              <>
                <dt>Total</dt>
                <dd>{recipe.totalTimeMinutes} minutes</dd>
              </>
            )}
          </dl>
          {recipe.sourceUrl && (
            <p>
              <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">
                View original source
              </a>
            </p>
          )}
          <div className="chips">
            {[...recipe.tags, ...recipe.dietaryFlags].map((label) => (
              <Chip key={label}>{label}</Chip>
            ))}
          </div>
        </Card>
        <Card as="section">
          <Heading as="h2" level={5}>
            Ingredients
          </Heading>
          <ul>
            {recipe.ingredients.map((item) => (
              <li key={item.displayOrder}>
                {item.quantity} {item.unit} {item.ingredientName}
                {item.notes && ` — ${item.notes}`}
              </li>
            ))}
          </ul>
        </Card>
        <Card as="section">
          <Heading as="h2" level={5}>
            Method
          </Heading>
          <ol>
            {recipe.steps.map((step) => (
              <li key={step.stepOrder}>
                {step.instruction}
                {step.durationMinutes !== undefined && (
                  <small>{step.durationMinutes} minutes</small>
                )}
              </li>
            ))}
          </ol>
        </Card>
        {recipe.notes && (
          <Card as="section">
            <Heading as="h2" level={5}>
              Notes
            </Heading>
            <p className="preserve-lines">{recipe.notes}</p>
          </Card>
        )}
        <Card as="section">
          <Heading as="h2" level={5}>
            Delete recipe
          </Heading>
          <p>This cannot be undone.</p>
          <DeleteRecipeForm recipeId={recipe.id} />
        </Card>
      </div>
    </>
  );
}
