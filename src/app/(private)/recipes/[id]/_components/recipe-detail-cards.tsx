import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Heading } from "@/components/ui/heading";
import { Inline } from "@/components/ui/inline";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";
import type { Recipe } from "@/lib/db/recipe-repository";
import type { RecipeDocumentContent } from "@/lib/validation/recipe-document";
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
        <Inline gap="100">
          {recipe.tags.map((label) => (
            <Chip key={label}>{label}</Chip>
          ))}
        </Inline>
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
              {item.amount ? `${item.amount} ` : ""}
              {item.ingredientName}
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

/** Read-only composition for the denormalized recipe document contract. */
export function RecipeDocumentDetailCards({ recipe }: { recipe: RecipeDocumentContent }) {
  return (
    <>
      <RecipeDocumentDetailsCard recipe={recipe} />
      <RecipeDocumentIngredientsCard ingredients={recipe.ingredients} />
      {recipe.equipment.length > 0 && <RecipeDocumentEquipmentCard equipment={recipe.equipment} />}
      <RecipeDocumentMethodCard instructions={recipe.instructions} />
      {recipe.notes.length > 0 && <RecipeDocumentNotesCard notes={recipe.notes} />}
    </>
  );
}

export function RecipeDocumentDetailsCard({ recipe }: { recipe: RecipeDocumentContent }) {
  return (
    <Card as="section">
      <Stack gap="150">
        <Heading as="h2" level={5}>
          Details
        </Heading>
        <dl className={styles.details}>
          {recipe.yield && (
            <>
              <Text as="dt">Yield</Text>
              <Text as="dd">
                {recipe.yield.amount} {recipe.yield.unit}
              </Text>
            </>
          )}
          {recipe.time.prepMinutes !== undefined && (
            <>
              <Text as="dt">Prep</Text>
              <Text as="dd">{recipe.time.prepMinutes} minutes</Text>
            </>
          )}
          {recipe.time.cookMinutes !== undefined && (
            <>
              <Text as="dt">Cook</Text>
              <Text as="dd">{recipe.time.cookMinutes} minutes</Text>
            </>
          )}
          {recipe.time.totalMinutes !== undefined && (
            <>
              <Text as="dt">Total</Text>
              <Text as="dd">{recipe.time.totalMinutes} minutes</Text>
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
        {recipe.tags.length > 0 && (
          <Inline gap="100">
            {recipe.tags.map((label) => (
              <Chip key={label}>{label}</Chip>
            ))}
          </Inline>
        )}
      </Stack>
    </Card>
  );
}

export function RecipeDocumentIngredientsCard({
  ingredients,
}: {
  ingredients: RecipeDocumentContent["ingredients"];
}) {
  return (
    <Card as="section">
      <Stack gap="150">
        <Heading as="h2" level={5}>
          Ingredients
        </Heading>
        <Stack as="ul" gap="100" className={styles.list}>
          {ingredients.map((item, index) => (
            <Text as="li" key={index}>
              {item.amount ? `${item.amount} ` : ""}
              {item.name}
              {item.note && ` — ${item.note}`}
            </Text>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}

export function RecipeDocumentEquipmentCard({
  equipment,
}: {
  equipment: RecipeDocumentContent["equipment"];
}) {
  return (
    <Card as="section">
      <Stack gap="150">
        <Heading as="h2" level={5}>
          Equipment
        </Heading>
        <Stack as="ul" gap="100" className={styles.list}>
          {equipment.map((item, index) => (
            <Text as="li" key={index}>
              {item.name}
              {item.note && ` — ${item.note}`}
            </Text>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}

export function RecipeDocumentMethodCard({
  instructions,
}: {
  instructions: RecipeDocumentContent["instructions"];
}) {
  return (
    <Card as="section">
      <Stack gap="150">
        <Heading as="h2" level={5}>
          Method
        </Heading>
        <Stack as="ol" gap="100" className={styles.list}>
          {instructions.map((instruction, index) => (
            <Text as="li" key={index}>
              {instruction}
            </Text>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}

export function RecipeDocumentNotesCard({ notes }: { notes: RecipeDocumentContent["notes"] }) {
  return (
    <Card as="section">
      <Stack gap="150">
        <Heading as="h2" level={5}>
          Notes
        </Heading>
        <Stack as="ul" gap="100" className={styles.list}>
          {notes.map((note, index) => (
            <Text as="li" key={index}>
              {note}
            </Text>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}
