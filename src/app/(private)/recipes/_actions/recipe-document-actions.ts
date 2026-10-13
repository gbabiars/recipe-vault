"use server";

import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/auth/require-user";
import { getRecipeService } from "@/lib/recipes";
import { recipeContentSchema, recipeSchema, type RecipeContent } from "@/lib/validation/recipe";
import type {
  RecipeDocumentSaveContext,
  RecipeDocumentSaveResult,
} from "../_components/recipe-document-form";

export type RecipeDocumentActionResult = RecipeDocumentSaveResult;
export type RecipeDocumentDeleteActionResult =
  | { status: "deleted" }
  | { status: "conflict"; revision?: number }
  | { status: "not_found" }
  | { status: "invalid"; issues?: Array<{ path: Array<string | number>; message: string }> };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalid(
  path: Array<string | number>,
  message: string,
): Exclude<RecipeDocumentActionResult, void> {
  return { status: "invalid", issues: [{ path, message }] };
}

function invalidDelete(
  path: Array<string | number>,
  message: string,
): Exclude<RecipeDocumentDeleteActionResult, { status: "deleted" | "conflict" | "not_found" }> {
  return { status: "invalid", issues: [{ path, message }] };
}

/** Creates or replaces one complete recipe document for the authenticated owner. */
export async function saveRecipeDocumentAction(
  content: RecipeContent,
  context: RecipeDocumentSaveContext = {},
): Promise<RecipeDocumentActionResult> {
  const user = await requireUser();

  if (context === null || typeof context !== "object" || Array.isArray(context)) {
    return invalid(["context"], "Recipe save context is invalid.");
  }
  if (Object.keys(context).some((key) => key !== "recipeId" && key !== "expectedRevision")) {
    return invalid(["context"], "Recipe save context contains unsupported fields.");
  }

  const hasRecipeId = context.recipeId !== undefined;
  const hasExpectedRevision = context.expectedRevision !== undefined;
  if (hasRecipeId !== hasExpectedRevision) {
    return invalid(
      [hasRecipeId ? "expectedRevision" : "recipeId"],
      "Recipe save context is incomplete.",
    );
  }

  if (!hasRecipeId) {
    const parsedContent = recipeContentSchema.safeParse(content);
    if (!parsedContent.success) {
      return {
        status: "invalid",
        issues: parsedContent.error.issues.map((issue) => ({
          path: issue.path.map((part) => (typeof part === "number" ? part : String(part))),
          message: issue.message,
        })),
      };
    }
    try {
      const result = await (
        await getRecipeService()
      ).createDocument(user.id, parsedContent.data, {
        requestId: randomUUID(),
        method: "SERVER_ACTION_CREATE",
      });
      return result.status === "saved" ? { status: "saved" } : result;
    } catch {
      return invalid([], "Unable to save this recipe. Please try again.");
    }
  }

  if (typeof context.recipeId !== "string" || !uuidPattern.test(context.recipeId)) {
    return invalid(["recipeId"], "Recipe ID is invalid.");
  }
  if (
    typeof context.expectedRevision !== "number" ||
    !Number.isSafeInteger(context.expectedRevision) ||
    context.expectedRevision < 1 ||
    context.expectedRevision > 2_147_483_647
  ) {
    return invalid(["expectedRevision"], "Expected revision must be a positive integer.");
  }

  const parsedRecipe = recipeSchema.safeParse({ ...content, id: context.recipeId });
  if (!parsedRecipe.success) {
    return {
      status: "invalid",
      issues: parsedRecipe.error.issues.map((issue) => ({
        path: issue.path.map((part) => (typeof part === "number" ? part : String(part))),
        message: issue.message,
      })),
    };
  }

  try {
    const result = await (
      await getRecipeService()
    ).replaceDocument(user.id, parsedRecipe.data, context.expectedRevision, {
      requestId: randomUUID(),
      method: "SERVER_ACTION_REPLACE",
    });
    return result.status === "saved" ? { status: "saved" } : result;
  } catch {
    return invalid([], "Unable to save this recipe. Please try again.");
  }
}

/** Deletes only the authenticated owner's recipe at the revision shown by the caller. */
export async function deleteRecipeDocumentAction(
  recipeId: string,
  expectedRevision: number,
): Promise<RecipeDocumentDeleteActionResult> {
  const user = await requireUser();

  if (typeof recipeId !== "string" || !uuidPattern.test(recipeId)) {
    return invalidDelete(["recipeId"], "Recipe ID is invalid.");
  }
  if (
    typeof expectedRevision !== "number" ||
    !Number.isSafeInteger(expectedRevision) ||
    expectedRevision < 1 ||
    expectedRevision > 2_147_483_647
  ) {
    return invalidDelete(["expectedRevision"], "Expected revision must be a positive integer.");
  }

  try {
    const result = await (
      await getRecipeService()
    ).deleteDocument(user.id, recipeId, expectedRevision, {
      requestId: randomUUID(),
      method: "SERVER_ACTION_DELETE",
    });
    return result.status === "deleted" ? { status: "deleted" } : result;
  } catch {
    return invalidDelete([], "Unable to delete this recipe. Please try again.");
  }
}
