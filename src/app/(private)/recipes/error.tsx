"use client";

import feedbackStyles from "../page-feedback.module.css";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";

export default function RecipesError({ reset }: { reset: () => void }) {
  return (
    <Card as="section" className={feedbackStyles.errorMessage} role="alert" padding="large">
      <Stack gap="150">
        <Heading>Something went wrong</Heading>
        <Text as="p">Recipe Vault could not complete that request.</Text>
        <div>
          <Button onClick={reset}>Try again</Button>
        </div>
      </Stack>
    </Card>
  );
}
