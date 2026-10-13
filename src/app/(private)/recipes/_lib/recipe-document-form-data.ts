import { recipeDocumentContentSchema, type RecipeContent } from "@/lib/validation/recipe-document";

export type RecipeDocumentFormErrors = Record<string, string>;

export type RecipeDocumentFormDataResult =
  | { success: true; data: RecipeContent }
  | { success: false; errors: RecipeDocumentFormErrors };

const emptyToUndefined = (value: string) => (value.trim() ? value.trim() : undefined);

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function count(formData: FormData, name: string, submittedFieldCount: number): number {
  const raw = field(formData, name);
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= submittedFieldCount ? parsed : -1;
}

function errorMap(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const errors: RecipeDocumentFormErrors = {};
  for (const issue of issues) {
    const path = issue.path.map(String).join(".") || "form";
    errors[path] ??= issue.message;
  }
  return errors;
}

/** Converts the document form's ordered repeated fields into complete recipe content. */
export function parseRecipeDocumentFormData(formData: FormData): RecipeDocumentFormDataResult {
  const submittedFieldCount = Array.from(formData.keys()).length;
  const ingredientCount = count(formData, "ingredientCount", submittedFieldCount);
  const equipmentCount = count(formData, "equipmentCount", submittedFieldCount);
  const instructionCount = count(formData, "instructionCount", submittedFieldCount);
  const noteCount = count(formData, "noteCount", submittedFieldCount);

  if ([ingredientCount, equipmentCount, instructionCount, noteCount].some((value) => value < 0)) {
    return {
      success: false,
      errors: {
        form: "The recipe form contains an invalid number of items. Reload and try again.",
      },
    };
  }

  const prepMinutes = emptyToUndefined(field(formData, "prepMinutes"));
  const cookMinutes = emptyToUndefined(field(formData, "cookMinutes"));
  const totalMinutes = emptyToUndefined(field(formData, "totalMinutes"));
  const yieldAmount = emptyToUndefined(field(formData, "yieldAmount"));
  const yieldUnit = emptyToUndefined(field(formData, "yieldUnit"));
  const sourceUrl = emptyToUndefined(field(formData, "sourceUrl"));

  const candidate = {
    title: field(formData, "title"),
    description: field(formData, "description"),
    ...(yieldAmount !== undefined || yieldUnit !== undefined
      ? {
          yield: {
            amount: yieldAmount === undefined ? Number.NaN : Number(yieldAmount),
            unit: yieldUnit ?? "",
          },
        }
      : {}),
    time: {
      ...(prepMinutes === undefined ? {} : { prepMinutes: Number(prepMinutes) }),
      ...(cookMinutes === undefined ? {} : { cookMinutes: Number(cookMinutes) }),
      ...(totalMinutes === undefined ? {} : { totalMinutes: Number(totalMinutes) }),
    },
    ingredients: Array.from({ length: ingredientCount }, (_, index) => ({
      name: field(formData, `ingredient.${index}.name`),
      ...(emptyToUndefined(field(formData, `ingredient.${index}.amount`)) === undefined
        ? {}
        : { amount: emptyToUndefined(field(formData, `ingredient.${index}.amount`)) }),
      ...(emptyToUndefined(field(formData, `ingredient.${index}.note`)) === undefined
        ? {}
        : { note: emptyToUndefined(field(formData, `ingredient.${index}.note`)) }),
    })),
    equipment: Array.from({ length: equipmentCount }, (_, index) => ({
      name: field(formData, `equipment.${index}.name`),
      ...(emptyToUndefined(field(formData, `equipment.${index}.note`)) === undefined
        ? {}
        : { note: emptyToUndefined(field(formData, `equipment.${index}.note`)) }),
    })),
    instructions: Array.from({ length: instructionCount }, (_, index) =>
      field(formData, `instruction.${index}`),
    ),
    notes: Array.from({ length: noteCount }, (_, index) => field(formData, `note.${index}`)),
    tags: formData
      .getAll("tags")
      .flatMap((tag) => (typeof tag === "string" ? tag.split(/[\n,]/) : []))
      .map((tag) => tag.trim())
      .filter(Boolean),
    ...(sourceUrl === undefined ? {} : { sourceUrl }),
  };

  const parsed = recipeDocumentContentSchema.safeParse(candidate);
  if (!parsed.success) return { success: false, errors: errorMap(parsed.error.issues) };
  return { success: true, data: parsed.data };
}
