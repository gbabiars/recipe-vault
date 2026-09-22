"use client";

import { Card } from "@/components/ui/card";

export default function RecipesError({ reset }: { reset: () => void }) {
  return (
    <>
      <Card as="section" className="error-message" role="alert" padding="large">
        <h1>Something went wrong</h1>
        <p>Recipe Vault could not complete that request.</p>
        <button onClick={reset}>Try again</button>
      </Card>
    </>
  );
}
