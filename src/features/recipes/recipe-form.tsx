"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ComboboxField, type ComboboxOption } from "@/components/ui/combobox";
import { Heading } from "@/components/ui/heading";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";
import { TextInput } from "@/components/ui/text-input";
import { Textarea } from "@/components/ui/textarea";
import type { Recipe } from "@/lib/db/recipe-repository";
import { tagNameSchema } from "@/lib/validation/recipe";
import { deserializeCommaDelimitedLabels } from "./recipe-form-data";
import styles from "./recipe-form.module.css";
import { emptyRecipeFormState } from "./recipe-form-state";
import type { RecipeFormState } from "./recipe-form-state";

type IngredientRow = { amount?: string; ingredientName?: string; notes?: string };
type StepRow = { instruction?: string; durationMinutes?: number };
type RecipeFormAction = (state: RecipeFormState, formData: FormData) => Promise<RecipeFormState>;
const blankIngredient: IngredientRow = { amount: "", ingredientName: "", notes: "" };
const blankStep: StepRow = { instruction: "", durationMinutes: undefined };
const commonRecipeTags = ["dinner", "soup", "weeknight"];
const errorFor = (errors: Record<string, string>, key: string) =>
  errors[key] || errors[key.split(".")[0]];

export function RecipeForm({
  recipe,
  saveAction,
}: {
  recipe?: Recipe;
  saveAction: RecipeFormAction;
}) {
  const [state, action, pending] = useActionState(saveAction, emptyRecipeFormState);
  const formRef = useRef<HTMLFormElement>(null);
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    recipe?.ingredients.length ? recipe.ingredients : [blankIngredient],
  );
  const [steps, setSteps] = useState<StepRow[]>(recipe?.steps.length ? recipe.steps : [blankStep]);
  const tags = deserializeCommaDelimitedLabels(recipe?.tags.join(", "));
  const tagOptions: ComboboxOption[] = [...new Set([...commonRecipeTags, ...tags])].map(
    (value) => ({
      value,
      label: value,
    }),
  );
  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [state.errors]);
  const field = (
    name: string,
    label: string,
    type: "text" | "number" | "url" = "text",
    defaultValue?: string | number,
    hint?: string,
    errorKey = name,
  ) => {
    const error = errorFor(state.errors, errorKey);
    return (
      <TextInput
        name={name}
        label={label}
        type={type}
        defaultValue={defaultValue}
        helpText={hint}
        error={error}
      />
    );
  };
  const textarea = (name: string, label: string, defaultValue?: string, errorKey = name) => {
    return (
      <Textarea
        name={name}
        label={label}
        defaultValue={defaultValue}
        error={errorFor(state.errors, errorKey)}
      />
    );
  };
  return (
    <Stack as="form" ref={formRef} action={action} gap="200" noValidate>
      {recipe && <input type="hidden" name="recipeId" value={recipe.id} />}
      {state.message && (
        <Text as="p" appearance="error" className={styles.formMessage} role="alert">
          {state.message}
        </Text>
      )}
      <Card as="section">
        <Stack gap="100">
          <Heading as="h2" level={5}>
            Recipe details
          </Heading>
          {field("title", "Title", "text", recipe?.title)}
          {textarea("summary", "Summary", recipe?.summary)}
          <div className={styles.formGrid}>
            {field("servings", "Servings", "number", recipe?.servings)}
            {field("prepTimeMinutes", "Prep time (minutes)", "number", recipe?.prepTimeMinutes)}
            {field("cookTimeMinutes", "Cook time (minutes)", "number", recipe?.cookTimeMinutes)}
            {field("totalTimeMinutes", "Total time (minutes)", "number", recipe?.totalTimeMinutes)}
          </div>
          <ComboboxField
            name="tags"
            label="Tags"
            placeholder="Search or add tags"
            helpText="Choose a suggestion or add a tag."
            error={errorFor(state.errors, "tags")}
            multiple
            defaultValue={tags}
            options={tagOptions}
            createOption={(query) => {
              const result = tagNameSchema.safeParse(query);
              return result.success ? { value: result.data, label: result.data } : null;
            }}
          />
          {field("sourceUrl", "Source URL", "url", recipe?.sourceUrl)}
          {textarea("notes", "Notes", recipe?.notes)}
        </Stack>
      </Card>
      <Card as="section">
        <Stack gap="100">
          <div className={styles.sectionHeading}>
            <Heading as="h2" level={5}>
              Ingredients
            </Heading>
            <Button type="button" onClick={() => setIngredients([...ingredients, blankIngredient])}>
              Add ingredient
            </Button>
          </div>
          <input type="hidden" name="ingredientCount" value={ingredients.length} />
          {ingredients.map((ingredient, index) => (
            <fieldset className={styles.repeatRow} key={index}>
              <legend>Ingredient {index + 1}</legend>
              <div className={styles.ingredientGrid}>
                <div className={styles.ingredientName}>
                  {field(
                    `ingredient-${index}-name`,
                    "Ingredient name",
                    "text",
                    ingredient.ingredientName,
                    undefined,
                    `ingredients.${index}.ingredientName`,
                  )}
                </div>
                <div className={styles.ingredientAmount}>
                  {field(
                    `ingredient-${index}-amount`,
                    "Amount (optional)",
                    "text",
                    ingredient.amount,
                    undefined,
                    `ingredients.${index}.amount`,
                  )}
                </div>
                <div className={styles.ingredientNotes}>
                  {field(
                    `ingredient-${index}-notes`,
                    "Notes (optional)",
                    "text",
                    ingredient.notes,
                    undefined,
                    `ingredients.${index}.notes`,
                  )}
                </div>
              </div>
              {ingredients.length > 1 && (
                <Button
                  type="button"
                  variant="subtle"
                  onClick={() => setIngredients(ingredients.filter((_, row) => row !== index))}
                >
                  Remove ingredient {index + 1}
                </Button>
              )}
            </fieldset>
          ))}
        </Stack>
      </Card>
      <Card as="section">
        <Stack gap="100">
          <div className={styles.sectionHeading}>
            <Heading as="h2" level={5}>
              Steps
            </Heading>
            <Button type="button" onClick={() => setSteps([...steps, blankStep])}>
              Add step
            </Button>
          </div>
          <input type="hidden" name="stepCount" value={steps.length} />
          {steps.map((step, index) => (
            <fieldset className={styles.repeatRow} key={index}>
              <legend>Step {index + 1}</legend>
              {textarea(
                `step-${index}-instruction`,
                "Instruction",
                step.instruction,
                `steps.${index}.instruction`,
              )}
              {field(
                `step-${index}-durationMinutes`,
                "Duration (minutes, optional)",
                "number",
                step.durationMinutes,
                undefined,
                `steps.${index}.durationMinutes`,
              )}
              {steps.length > 1 && (
                <Button
                  type="button"
                  variant="subtle"
                  onClick={() => setSteps(steps.filter((_, row) => row !== index))}
                >
                  Remove step {index + 1}
                </Button>
              )}
            </fieldset>
          ))}
        </Stack>
      </Card>
      <div>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : recipe ? "Save changes" : "Create recipe"}
        </Button>
      </div>
    </Stack>
  );
}
