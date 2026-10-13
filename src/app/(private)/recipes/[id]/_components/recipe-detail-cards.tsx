import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Heading } from "@/components/ui/heading";
import { Inline } from "@/components/ui/inline";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";
import type { RecipeContent } from "@/lib/validation/recipe";
import styles from "./recipe-detail-cards.module.css";

export function RecipeDetailsCard({ recipe }: { recipe: RecipeContent }) {
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

export function RecipeIngredientsCard({
  ingredients,
}: {
  ingredients: RecipeContent["ingredients"];
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

export function RecipeMethodCard({
  instructions,
}: {
  instructions: RecipeContent["instructions"];
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

export function RecipeNotesCard({ notes }: { notes: RecipeContent["notes"] }) {
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

export function RecipeEquipmentCard({ equipment }: { equipment: RecipeContent["equipment"] }) {
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

/** Read-only composition for a recipe document. */
export function RecipeDocumentDetailCards({ recipe }: { recipe: RecipeContent }) {
  return (
    <>
      <RecipeDetailsCard recipe={recipe} />
      <RecipeIngredientsCard ingredients={recipe.ingredients} />
      {recipe.equipment.length > 0 && <RecipeEquipmentCard equipment={recipe.equipment} />}
      <RecipeMethodCard instructions={recipe.instructions} />
      {recipe.notes.length > 0 && <RecipeNotesCard notes={recipe.notes} />}
    </>
  );
}
