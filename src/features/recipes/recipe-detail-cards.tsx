import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Heading } from "@/components/ui/heading";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";
import type { Recipe } from "@/lib/db/recipe-repository";
import { DeleteRecipeForm, type DeleteRecipeAction } from "./delete-recipe-form";
import styles from "./recipe-detail-cards.module.css";

export function RecipeDetailsCard({ recipe }: { recipe: Recipe }) {
  return (
    <Card as="section">
      <Stack gap="150">
        <Heading as="h2" level={5}>
          Details
        </Heading>
        <dl className={styles.details}>
          {recipe.servings !== undefined && (
            <>
              <Text as="dt">Servings</Text>
              <Text as="dd">{recipe.servings}</Text>
            </>
          )}
          {recipe.prepTimeMinutes !== undefined && (
            <>
              <Text as="dt">Prep</Text>
              <Text as="dd">{recipe.prepTimeMinutes} minutes</Text>
            </>
          )}
          {recipe.cookTimeMinutes !== undefined && (
            <>
              <Text as="dt">Cook</Text>
              <Text as="dd">{recipe.cookTimeMinutes} minutes</Text>
            </>
          )}
          {recipe.totalTimeMinutes !== undefined && (
            <>
              <Text as="dt">Total</Text>
              <Text as="dd">{recipe.totalTimeMinutes} minutes</Text>
            </>
          )}
        </dl>
        {recipe.sourceUrl && (
          <Text as="p">
            <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">
              View original source
            </a>
          </Text>
        )}
        <div className={styles.chips}>
          {[...recipe.tags, ...recipe.dietaryFlags].map((label) => (
            <Chip key={label}>{label}</Chip>
          ))}
        </div>
      </Stack>
    </Card>
  );
}

export function RecipeIngredientsCard({ ingredients }: { ingredients: Recipe["ingredients"] }) {
  return (
    <Card as="section">
      <Stack gap="150">
        <Heading as="h2" level={5}>
          Ingredients
        </Heading>
        <Stack as="ul" gap="100" className={styles.list}>
          {ingredients.map((item) => (
            <Text as="li" key={item.displayOrder}>
              {item.quantity} {item.unit} {item.ingredientName}
              {item.notes && ` — ${item.notes}`}
            </Text>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}

export function RecipeMethodCard({ steps }: { steps: Recipe["steps"] }) {
  return (
    <Card as="section">
      <Stack gap="150">
        <Heading as="h2" level={5}>
          Method
        </Heading>
        <Stack as="ol" gap="100" className={styles.list}>
          {steps.map((step) => (
            <Text as="li" key={step.stepOrder}>
              {step.instruction}
              {step.durationMinutes !== undefined && (
                <Text as="small" appearance="secondary" className={styles.duration}>
                  {step.durationMinutes} minutes
                </Text>
              )}
            </Text>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}

export function RecipeNotesCard({ notes }: { notes: string }) {
  return (
    <Card as="section">
      <Stack gap="150">
        <Heading as="h2" level={5}>
          Notes
        </Heading>
        <Text as="p" className={styles.notes}>
          {notes}
        </Text>
      </Stack>
    </Card>
  );
}

export function RecipeDeleteCard({
  recipeId,
  deleteAction,
}: {
  recipeId: string;
  deleteAction: DeleteRecipeAction;
}) {
  return (
    <Card as="section">
      <Stack gap="150">
        <Heading as="h2" level={5}>
          Delete recipe
        </Heading>
        <Text as="p">This cannot be undone.</Text>
        <DeleteRecipeForm recipeId={recipeId} deleteAction={deleteAction} />
      </Stack>
    </Card>
  );
}
