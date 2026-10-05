export type RecipeFormState = {
  errors: Record<string, string>;
  message?: string;
  deleted?: boolean;
};

export const emptyRecipeFormState: RecipeFormState = { errors: {} };
