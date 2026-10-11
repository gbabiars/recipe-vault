# Recipe document schema

Status: agreed logical schema. The Postgres storage layout and migration plan are not yet decided.

```ts
type RecipeDocument = {
  id: string;
  title: string;
  description: string;
  yield: {
    amount: number;
    unit: string;
  };
  time: {
    prepMinutes?: number;
    cookMinutes?: number;
    totalMinutes?: number;
  };
  ingredients: Array<{
    name: string;
    amount?: string;
    note?: string;
  }>;
  equipment: Array<{
    name: string;
    note?: string;
  }>;
  instructions: string[];
  notes: string[];
  tags: string[];
  sourceUrl?: string;
};
```

The document's `id` is unique and immutable. A complete recipe has a nonempty title,
a positive yield amount, at least one ingredient, and at least one instruction.
Equipment and recipe notes may be empty arrays. Array positions determine ingredient,
equipment, instruction, and note order.

`tags` is always present and may be empty. It accepts up to 32 names. Names are
at most 64 characters and use the existing recipe tag rules: lowercase ASCII
letters and digits, spaces, underscores, or hyphens; no leading or trailing
whitespace; and one space between words. Duplicate names are removed.
`sourceUrl` is an optional HTTP(S) URL of at most 2,000 characters for the
recipe's source. A recipe created without a web source omits it.

An ingredient's `amount` preserves the recipe's exact wording, including ranges and
phrases such as "to taste." An absent `amount` means no amount was stated. Its `note`
describes preparation or condition, such as "minced" or "cooled." Ingredient names
describe the food in the form used, such as "cooked white rice."

Time values are nonnegative whole minutes and may be omitted when unknown.
`totalMinutes` is elapsed start-to-finish time and need not equal `prepMinutes` plus
`cookMinutes`. `notes` are recipe-level tips; actionable directions belong in
`instructions`.

Ownership and storage metadata are outside the logical recipe document. The storage
design must preserve the application's private, owner-bound access rules.
