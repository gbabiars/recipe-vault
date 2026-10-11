"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Inline } from "@/components/ui/inline";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";
import { TextInput } from "@/components/ui/text-input";
import { Textarea } from "@/components/ui/textarea";
import type { RecipeDocumentContent } from "@/lib/validation/recipe-document";
import {
  parseRecipeDocumentFormData,
  type RecipeDocumentFormErrors,
} from "../_lib/recipe-document-form-data";

type RecipeDocumentEdit = {
  id: string;
  revision: number;
  content: RecipeDocumentContent;
};

export type RecipeDocumentSaveContext = {
  recipeId?: string;
  expectedRevision?: number;
};

export type RecipeDocumentSaveResult =
  | void
  | { status: "saved" }
  | { status: "conflict"; revision?: number }
  | { status: "not_found" }
  | { status: "invalid"; issues?: Array<{ path: Array<string | number>; message: string }> };

export type RecipeDocumentSaveAction = (
  content: RecipeDocumentContent,
  context: RecipeDocumentSaveContext,
) => Promise<RecipeDocumentSaveResult>;

export type RecipeDocumentSavedAction = () => void | Promise<void>;

type IngredientValue = RecipeDocumentContent["ingredients"][number];
type EquipmentValue = RecipeDocumentContent["equipment"][number];

const blankIngredient: IngredientValue = { name: "" };
const blankEquipment: EquipmentValue = { name: "" };

function blankContent(): RecipeDocumentContent {
  return {
    title: "",
    description: "",
    time: {},
    ingredients: [blankIngredient],
    equipment: [],
    instructions: [""],
    notes: [],
    tags: [],
  };
}

function mapIssues(issues: Array<{ path: Array<string | number>; message: string }>) {
  const errors: RecipeDocumentFormErrors = {};
  for (const issue of issues) errors[issue.path.map(String).join(".") || "form"] ??= issue.message;
  return errors;
}

function errorFor(errors: RecipeDocumentFormErrors, path: string) {
  return errors[path] ?? errors[path.split(".")[0]];
}

/** A complete document editor. Persistence and owner authorization stay in the caller. */
export function RecipeDocumentForm({
  recipe,
  saveRecipe,
  onSaved,
}: {
  recipe?: RecipeDocumentEdit;
  saveRecipe: RecipeDocumentSaveAction;
  onSaved?: RecipeDocumentSavedAction;
}) {
  const [content, setContent] = useState<RecipeDocumentContent>(
    () => recipe?.content ?? blankContent(),
  );
  const [tagsInput, setTagsInput] = useState(() => content.tags.join(", "));
  const [ingredients, setIngredients] = useState<IngredientValue[]>(content.ingredients);
  const [equipment, setEquipment] = useState<EquipmentValue[]>(content.equipment);
  const [instructions, setInstructions] = useState<string[]>(content.instructions);
  const [notes, setNotes] = useState<string[]>(content.notes);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<RecipeDocumentFormErrors>({});
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (Object.keys(errors).length === 0) return;
    const firstInvalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    const summary = formRef.current?.querySelector<HTMLElement>('[role="alert"]');
    (firstInvalid ?? summary)?.focus();
  }, [errors]);

  function updateRow<T>(rows: T[], setRows: (next: T[]) => void, index: number, value: Partial<T>) {
    setRows(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...value } : row)));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const parsed = parseRecipeDocumentFormData(new FormData(event.currentTarget));
    if (!parsed.success) {
      setSaved(false);
      setErrors(parsed.errors);
      return;
    }

    setPending(true);
    setSaved(false);
    setErrors({});
    try {
      const result = await saveRecipe(parsed.data, {
        ...(recipe === undefined ? {} : { recipeId: recipe.id, expectedRevision: recipe.revision }),
      });
      if (result?.status === "conflict") {
        setErrors({
          form:
            result.revision === undefined
              ? "This recipe changed while you were editing it. Reload the latest version before saving."
              : `This recipe changed while you were editing it. The latest version is revision ${result.revision}. Reload before saving.`,
        });
      } else if (result?.status === "not_found") {
        setErrors({
          form: "This recipe no longer exists. Return to the recipe list and try again.",
        });
      } else if (result?.status === "invalid") {
        setErrors(
          result.issues?.length
            ? mapIssues(result.issues)
            : { form: "The recipe could not be saved because its content is invalid." },
        );
      } else {
        setSaved(true);
        await onSaved?.();
      }
    } catch {
      setErrors({ form: "We could not save this recipe. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <Stack as="form" ref={formRef} gap="200" noValidate onSubmit={submit}>
      {recipe && <input type="hidden" name="recipeId" value={recipe.id} />}
      {recipe && <input type="hidden" name="expectedRevision" value={recipe.revision} />}
      {(errors.form || Object.keys(errors).length > 0) && (
        <Text as="p" appearance="error" role="alert" tabIndex={-1}>
          {errors.form ?? "Review the highlighted fields and try again."}
        </Text>
      )}
      {saved && (
        <Text as="p" appearance="success" role="status">
          Recipe saved.
        </Text>
      )}

      <Card as="section">
        <Stack gap="100">
          <Heading as="h2" level={5}>
            Recipe details
          </Heading>
          <TextInput
            name="title"
            label="Title"
            required
            maxLength={200}
            value={content.title}
            error={errorFor(errors, "title")}
            onValueChange={(title) => setFieldValue("title", title)}
          />
          <Textarea
            name="description"
            label="Description"
            value={content.description}
            error={errorFor(errors, "description")}
            onValueChange={(description) => setFieldValue("description", description)}
          />
          <Inline gap="100" wrap>
            <TextInput
              name="yieldAmount"
              label="Yield amount (optional)"
              type="number"
              min={0}
              step="any"
              value={content.yield?.amount ?? ""}
              error={errorFor(errors, "yield.amount")}
              onValueChange={(value) => setYieldAmount(value)}
            />
            <TextInput
              name="yieldUnit"
              label="Yield unit (optional)"
              maxLength={64}
              value={content.yield?.unit ?? ""}
              error={errorFor(errors, "yield.unit")}
              onValueChange={(unit) => setYieldUnit(unit)}
            />
            <TextInput
              name="prepMinutes"
              label="Prep time (minutes)"
              type="number"
              min={0}
              step={1}
              value={content.time.prepMinutes ?? ""}
              error={errorFor(errors, "time.prepMinutes")}
              onValueChange={(value) => setTime("prepMinutes", value)}
            />
            <TextInput
              name="cookMinutes"
              label="Cook time (minutes)"
              type="number"
              min={0}
              step={1}
              value={content.time.cookMinutes ?? ""}
              error={errorFor(errors, "time.cookMinutes")}
              onValueChange={(value) => setTime("cookMinutes", value)}
            />
            <TextInput
              name="totalMinutes"
              label="Total time (minutes)"
              type="number"
              min={0}
              step={1}
              value={content.time.totalMinutes ?? ""}
              error={errorFor(errors, "time.totalMinutes")}
              onValueChange={(value) => setTime("totalMinutes", value)}
            />
          </Inline>
          <Textarea
            name="tags"
            label="Tags"
            helpText="Separate tags with commas or line breaks."
            value={tagsInput}
            error={errorFor(errors, "tags")}
            onValueChange={setTagsInput}
          />
          <TextInput
            name="sourceUrl"
            label="Source URL (optional)"
            type="url"
            maxLength={2_000}
            value={content.sourceUrl ?? ""}
            error={errorFor(errors, "sourceUrl")}
            onValueChange={(sourceUrl) => setFieldValue("sourceUrl", sourceUrl)}
          />
        </Stack>
      </Card>

      <Card as="section">
        <Stack gap="100">
          <Inline align="center" justify="between">
            <Heading as="h2" level={5}>
              Ingredients
            </Heading>
            <Button
              label="Add ingredient"
              type="button"
              onClick={() => setIngredients([...ingredients, { ...blankIngredient }])}
            />
          </Inline>
          <input type="hidden" name="ingredientCount" value={ingredients.length} />
          {ingredients.map((ingredient, index) => (
            <fieldset key={index}>
              <legend>Ingredient {index + 1}</legend>
              <Stack gap="100">
                <TextInput
                  name={`ingredient.${index}.name`}
                  label="Ingredient name"
                  required
                  maxLength={200}
                  value={ingredient.name}
                  error={errorFor(errors, `ingredients.${index}.name`)}
                  onValueChange={(name) => updateRow(ingredients, setIngredients, index, { name })}
                />
                <TextInput
                  name={`ingredient.${index}.amount`}
                  label="Amount (optional)"
                  maxLength={128}
                  value={ingredient.amount ?? ""}
                  error={errorFor(errors, `ingredients.${index}.amount`)}
                  onValueChange={(amount) =>
                    updateRow(ingredients, setIngredients, index, { amount: amount || undefined })
                  }
                />
                <TextInput
                  name={`ingredient.${index}.note`}
                  label="Preparation note (optional)"
                  maxLength={1_000}
                  value={ingredient.note ?? ""}
                  error={errorFor(errors, `ingredients.${index}.note`)}
                  onValueChange={(note) =>
                    updateRow(ingredients, setIngredients, index, { note: note || undefined })
                  }
                />
                {ingredients.length > 1 && (
                  <Button
                    label={`Remove ingredient ${index + 1}`}
                    type="button"
                    variant="subtle"
                    onClick={() => setIngredients(ingredients.filter((_, row) => row !== index))}
                  />
                )}
              </Stack>
            </fieldset>
          ))}
          {errors.ingredients && <Text appearance="error">{errors.ingredients}</Text>}
        </Stack>
      </Card>

      <Card as="section">
        <Stack gap="100">
          <Inline align="center" justify="between">
            <Heading as="h2" level={5}>
              Equipment
            </Heading>
            <Button
              label="Add equipment"
              type="button"
              onClick={() => setEquipment([...equipment, { ...blankEquipment }])}
            />
          </Inline>
          <input type="hidden" name="equipmentCount" value={equipment.length} />
          {equipment.map((item, index) => (
            <fieldset key={index}>
              <legend>Equipment {index + 1}</legend>
              <Stack gap="100">
                <TextInput
                  name={`equipment.${index}.name`}
                  label="Equipment name"
                  required
                  maxLength={200}
                  value={item.name}
                  error={errorFor(errors, `equipment.${index}.name`)}
                  onValueChange={(name) => updateRow(equipment, setEquipment, index, { name })}
                />
                <TextInput
                  name={`equipment.${index}.note`}
                  label="Equipment note (optional)"
                  maxLength={1_000}
                  value={item.note ?? ""}
                  error={errorFor(errors, `equipment.${index}.note`)}
                  onValueChange={(note) =>
                    updateRow(equipment, setEquipment, index, { note: note || undefined })
                  }
                />
                <Button
                  label={`Remove equipment ${index + 1}`}
                  type="button"
                  variant="subtle"
                  onClick={() => setEquipment(equipment.filter((_, row) => row !== index))}
                />
              </Stack>
            </fieldset>
          ))}
        </Stack>
      </Card>

      <Card as="section">
        <Stack gap="100">
          <Inline align="center" justify="between">
            <Heading as="h2" level={5}>
              Instructions
            </Heading>
            <Button
              label="Add instruction"
              type="button"
              onClick={() => setInstructions([...instructions, ""])}
            />
          </Inline>
          <input type="hidden" name="instructionCount" value={instructions.length} />
          {instructions.map((instruction, index) => (
            <fieldset key={index}>
              <legend>Instruction {index + 1}</legend>
              <Stack gap="100">
                <Textarea
                  name={`instruction.${index}`}
                  label="Direction"
                  required
                  value={instruction}
                  error={errorFor(errors, `instructions.${index}`)}
                  onValueChange={(value) =>
                    setInstructions(instructions.map((row, i) => (i === index ? value : row)))
                  }
                />
                {instructions.length > 1 && (
                  <Button
                    label={`Remove instruction ${index + 1}`}
                    type="button"
                    variant="subtle"
                    onClick={() => setInstructions(instructions.filter((_, row) => row !== index))}
                  />
                )}
              </Stack>
            </fieldset>
          ))}
          {errors.instructions && <Text appearance="error">{errors.instructions}</Text>}
        </Stack>
      </Card>

      <Card as="section">
        <Stack gap="100">
          <Inline align="center" justify="between">
            <Heading as="h2" level={5}>
              Notes
            </Heading>
            <Button label="Add note" type="button" onClick={() => setNotes([...notes, ""])} />
          </Inline>
          <input type="hidden" name="noteCount" value={notes.length} />
          {notes.map((note, index) => (
            <fieldset key={index}>
              <legend>Note {index + 1}</legend>
              <Stack gap="100">
                <Textarea
                  name={`note.${index}`}
                  label="Recipe note"
                  value={note}
                  error={errorFor(errors, `notes.${index}`)}
                  onValueChange={(value) =>
                    setNotes(notes.map((row, i) => (i === index ? value : row)))
                  }
                />
                <Button
                  label={`Remove note ${index + 1}`}
                  type="button"
                  variant="subtle"
                  onClick={() => setNotes(notes.filter((_, row) => row !== index))}
                />
              </Stack>
            </fieldset>
          ))}
        </Stack>
      </Card>

      <div>
        <Button
          label={pending ? "Saving…" : recipe ? "Save changes" : "Create recipe"}
          type="submit"
          variant="primary"
          pending={pending}
        />
      </div>
    </Stack>
  );

  function setFieldValue<K extends "title" | "description" | "sourceUrl">(key: K, value: string) {
    setContent((current) => ({ ...current, [key]: value }));
  }

  function setYieldAmount(value: string) {
    setContent((current) => {
      const amount = value === "" ? undefined : Number(value);
      const unit = current.yield?.unit;
      return amount === undefined && unit === undefined
        ? { ...current, yield: undefined }
        : { ...current, yield: { amount: amount ?? 0, unit: unit ?? "" } };
    });
  }

  function setYieldUnit(unit: string) {
    setContent((current) => {
      const amount = current.yield?.amount;
      return amount === undefined && unit === ""
        ? { ...current, yield: undefined }
        : { ...current, yield: { amount: amount ?? 0, unit } };
    });
  }

  function setTime(key: "prepMinutes" | "cookMinutes" | "totalMinutes", value: string) {
    const parsed = value === "" ? undefined : Number(value);
    setContent((current) => ({ ...current, time: { ...current.time, [key]: parsed } }));
  }
}
