"use client";

import feedbackStyles from "../page-feedback.module.css";

import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";

export default function RecipesError({ reset }: { reset: () => void }) {
  return (
    <>
      <Card as="section" className={feedbackStyles.errorMessage} role="alert" padding="large">
        <Heading>Something went wrong</Heading>
        <p>Recipe Vault could not complete that request.</p>
        <button onClick={reset}>Try again</button>
      </Card>
    </>
  );
}
