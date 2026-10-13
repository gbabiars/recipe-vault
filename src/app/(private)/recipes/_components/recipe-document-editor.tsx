"use client";

import { useRouter } from "next/navigation";
import type { RecipeSnapshot } from "@/lib/db/recipe-repository";
import { RecipeDocumentForm } from "./recipe-document-form";
import { saveRecipeDocumentAction } from "../_actions/recipe-document-actions";

/** Connects the shared editor to the save action and route-specific success destination. */
export function RecipeDocumentEditor({
  snapshot,
  returnTo,
}: {
  snapshot?: RecipeSnapshot;
  returnTo: string;
}) {
  const router = useRouter();

  return (
    <RecipeDocumentForm
      {...(snapshot
        ? {
            recipe: {
              id: snapshot.recipe.id,
              revision: snapshot.revision,
              content: {
                title: snapshot.recipe.title,
                description: snapshot.recipe.description,
                ...(snapshot.recipe.yield === undefined ? {} : { yield: snapshot.recipe.yield }),
                time: snapshot.recipe.time,
                ingredients: snapshot.recipe.ingredients,
                equipment: snapshot.recipe.equipment,
                instructions: snapshot.recipe.instructions,
                notes: snapshot.recipe.notes,
                tags: snapshot.recipe.tags,
                ...(snapshot.recipe.sourceUrl === undefined
                  ? {}
                  : { sourceUrl: snapshot.recipe.sourceUrl }),
              },
            },
          }
        : {})}
      saveRecipe={saveRecipeDocumentAction}
      onSaved={() => router.push(returnTo)}
    />
  );
}
