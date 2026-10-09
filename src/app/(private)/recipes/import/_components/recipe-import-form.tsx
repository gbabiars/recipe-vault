"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stack } from "@/components/ui/stack";
import { TextInput } from "@/components/ui/text-input";
import { Text } from "@/components/ui/text";
import { importRecipeFromApi, RecipeImportError } from "../_lib/import-recipe-from-api";

export type RecipeImporter = (url: string) => Promise<{ id: string }>;

export function RecipeImportForm({ importRecipe }: { importRecipe: RecipeImporter }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(undefined);
    try {
      const { id } = await importRecipe(url);
      router.push(`/recipes/${encodeURIComponent(id)}`);
    } catch (failure) {
      setError(
        failure instanceof RecipeImportError
          ? failure.message
          : "We could not import this recipe. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit}>
        <Stack gap="200">
          <h2>Import from a website</h2>
          <TextInput
            name="url"
            label="Recipe website URL"
            type="url"
            required
            value={url}
            onValueChange={setUrl}
          />
          {error && (
            <div role="alert">
              <Text as="p" appearance="error">
                <strong>Could not import recipe.</strong> {error}
              </Text>
            </div>
          )}
          <div>
            <Button
              label={pending ? "Importing…" : "Import recipe"}
              type="submit"
              variant="primary"
              disabled={pending}
            />
          </div>
        </Stack>
      </form>
    </Card>
  );
}

export function RecipeImportPageForm() {
  return <RecipeImportForm importRecipe={importRecipeFromApi} />;
}
