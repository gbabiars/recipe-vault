"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import feedbackStyles from "../page-feedback.module.css";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";

export default function RecipesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

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
