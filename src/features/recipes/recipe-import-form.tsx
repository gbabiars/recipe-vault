"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";
import { TextInput } from "@/components/ui/text-input";

export type RecipeImportFormState = {
  errors: Record<string, string>;
  message?: string;
};

export type RecipeImportAction = (
  state: RecipeImportFormState,
  formData: FormData,
) => Promise<RecipeImportFormState>;

const initialState: RecipeImportFormState = { errors: {} };
const unavailableImportAction: RecipeImportAction = async () => ({
  errors: {},
  message: "Website import isn’t available yet.",
});

export function RecipeImportForm({ importAction }: { importAction: RecipeImportAction }) {
  const [state, action, pending] = useActionState(importAction, initialState);
  const [url, setUrl] = useState("");

  return (
    <Card>
      <form action={action}>
        <Stack gap="200">
          <TextInput
            name="url"
            label="Recipe website URL"
            type="url"
            required
            value={url}
            onValueChange={setUrl}
            error={state.errors.url}
          />
          {state.message && (
            <Text as="p" appearance="error" role="alert">
              {state.message}
            </Text>
          )}
          <div>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Importing…" : "Import recipe"}
            </Button>
          </div>
        </Stack>
      </form>
    </Card>
  );
}

export function RecipeImportPageForm() {
  return <RecipeImportForm importAction={unavailableImportAction} />;
}
