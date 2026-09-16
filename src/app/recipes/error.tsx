"use client";
export default function RecipesError({ reset }: { reset: () => void }) { return <main className="app-shell"><section className="error-panel"><h1>Something went wrong</h1><p>Recipe Vault could not complete that request.</p><button onClick={reset}>Try again</button></section></main>; }
