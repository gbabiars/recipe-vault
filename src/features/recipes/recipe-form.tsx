"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { TextInput } from "@/components/ui/text-input";
import { Textarea } from "@/components/ui/textarea";
import type { Recipe } from "@/lib/db/recipe-repository";
import { saveRecipeAction } from "./actions";
import { emptyRecipeFormState } from "./recipe-form-state";

type IngredientRow = { quantity?: number; unit?: string; ingredientName?: string; notes?: string };
type StepRow = { instruction?: string; durationMinutes?: number };
const blankIngredient: IngredientRow = { quantity: 1, unit: "", ingredientName: "", notes: "" };
const blankStep: StepRow = { instruction: "", durationMinutes: undefined };
const errorFor = (errors: Record<string, string>, key: string) =>
  errors[key] || errors[key.split(".")[0]];

export function RecipeForm({ recipe }: { recipe?: Recipe }) {
  const [state, action, pending] = useActionState(saveRecipeAction, emptyRecipeFormState);
  const formRef = useRef<HTMLFormElement>(null);
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    recipe?.ingredients.length ? recipe.ingredients : [blankIngredient],
  );
  const [steps, setSteps] = useState<StepRow[]>(recipe?.steps.length ? recipe.steps : [blankStep]);
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
    if (type !== "number") {
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
    }
    return (
      <Field name={name} invalid={Boolean(error)}>
        <FieldLabel>{label}</FieldLabel>
        <Input type={type} defaultValue={defaultValue} />
        {hint && <FieldDescription>{hint}</FieldDescription>}
        {error && <FieldError match={true}>{error}</FieldError>}
      </Field>
    );
  };
  const textarea = (name: string, label: string, defaultValue?: string, errorKey = name) => {
    const error = errorFor(state.errors, errorKey);
    return (
      <Field name={name} invalid={Boolean(error)}>
        <FieldLabel>{label}</FieldLabel>
        <Textarea defaultValue={defaultValue} />
        {error && <FieldError match={true}>{error}</FieldError>}
      </Field>
    );
  };
  return (
    <form ref={formRef} action={action} className="recipe-form" noValidate>
      {recipe && <input type="hidden" name="recipeId" value={recipe.id} />}
      {state.message && (
        <p className="form-message" role="alert">
          {state.message}
        </p>
      )}
      <Card as="section">
        <Heading as="h2" level={5}>
          Recipe details
        </Heading>
        {field("title", "Title", "text", recipe?.title)}
        {textarea("summary", "Summary", recipe?.summary)}
        <div className="form-grid">
          {field("servings", "Servings", "number", recipe?.servings)}
          {field("prepTimeMinutes", "Prep time (minutes)", "number", recipe?.prepTimeMinutes)}
          {field("cookTimeMinutes", "Cook time (minutes)", "number", recipe?.cookTimeMinutes)}
          {field("totalTimeMinutes", "Total time (minutes)", "number", recipe?.totalTimeMinutes)}
        </div>
        <div className="form-grid">
          {field("tags", "Tags", "text", recipe?.tags.join(", "), "Separate labels with commas")}
          {field(
            "dietaryFlags",
            "Dietary flags",
            "text",
            recipe?.dietaryFlags.join(", "),
            "Separate labels with commas",
          )}
        </div>
        {field("sourceUrl", "Source URL", "url", recipe?.sourceUrl)}
        {textarea("notes", "Notes", recipe?.notes)}
      </Card>
      <Card as="section">
        <div className="section-heading">
          <Heading as="h2" level={5}>
            Ingredients
          </Heading>
          <Button type="button" onClick={() => setIngredients([...ingredients, blankIngredient])}>
            Add ingredient
          </Button>
        </div>
        <input type="hidden" name="ingredientCount" value={ingredients.length} />
        {ingredients.map((ingredient, index) => (
          <fieldset className="repeat-row" key={index}>
            <legend>Ingredient {index + 1}</legend>
            {field(
              `ingredient-${index}-quantity`,
              "Quantity",
              "number",
              ingredient.quantity,
              undefined,
              `ingredients.${index}.quantity`,
            )}
            {field(
              `ingredient-${index}-unit`,
              "Unit",
              "text",
              ingredient.unit,
              undefined,
              `ingredients.${index}.unit`,
            )}
            {field(
              `ingredient-${index}-name`,
              "Ingredient name",
              "text",
              ingredient.ingredientName,
              undefined,
              `ingredients.${index}.ingredientName`,
            )}
            {field(
              `ingredient-${index}-notes`,
              "Notes (optional)",
              "text",
              ingredient.notes,
              undefined,
              `ingredients.${index}.notes`,
            )}
            {ingredients.length > 1 && (
              <button
                type="button"
                className="text-button"
                onClick={() => setIngredients(ingredients.filter((_, row) => row !== index))}
              >
                Remove ingredient {index + 1}
              </button>
            )}
          </fieldset>
        ))}
      </Card>
      <Card as="section">
        <div className="section-heading">
          <Heading as="h2" level={5}>
            Steps
          </Heading>
          <Button type="button" onClick={() => setSteps([...steps, blankStep])}>
            Add step
          </Button>
        </div>
        <input type="hidden" name="stepCount" value={steps.length} />
        {steps.map((step, index) => (
          <fieldset className="repeat-row" key={index}>
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
              <button
                type="button"
                className="text-button"
                onClick={() => setSteps(steps.filter((_, row) => row !== index))}
              >
                Remove step {index + 1}
              </button>
            )}
          </fieldset>
        ))}
      </Card>
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Saving…" : recipe ? "Save changes" : "Create recipe"}
      </Button>
    </form>
  );
}
