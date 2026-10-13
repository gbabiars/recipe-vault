# Recipe document schema and storage plan

Status: the logical recipe schema is agreed, and the JSONB storage design is implemented. The cutover migration and SQL checks have been applied and exercised only against local Supabase; no production migration has been run.

## Agreed recipe schema

```ts
type RecipeDocument = {
  id: string; // Unique and immutable
  title: string;
  description: string;
  yield?: {
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

A recipe's `id` is unique and immutable. A complete recipe has a nonempty title,
at least one ingredient, and at least one instruction. Omit `yield` when the
source does not state it; do not store `null` or infer a serving count. When
present, `yield` has a positive amount and a nonempty unit.
Array position supplies ingredient, equipment, instruction, and note order.
Equipment, notes, and tags can be empty arrays.

An ingredient's `amount` preserves the recipe's exact wording, including ranges
and phrases such as "to taste." An absent `amount` means no amount was stated.
Its `note` describes preparation or condition, such as "minced" or "cooled."
Ingredient names describe the food in the form used, such as "cooked white rice."
Recipe-level tips belong in `notes`; actionable directions belong in
`instructions`.

Time values are nonnegative whole minutes and may be omitted when unknown.
`totalMinutes` is elapsed start-to-finish time and need not equal `prepMinutes`
plus `cookMinutes`.

`tags` is always present and may be empty. It accepts up to 32 names. Names are
at most 64 characters and use the existing recipe tag rules: lowercase ASCII
letters and digits, spaces, underscores, or hyphens; no leading or trailing
whitespace; and one space between words. Duplicate names are removed.
Recipe documents are the source of tag names. A tag exists for an owner exactly
when at least one of that owner's recipes contains its name. Tags have no
independent ID, description, or unused state. The tag inventory and usage counts
are derived from the owner's recipe documents.

`sourceUrl` is an optional HTTP(S) URL of at most 2,000 characters for the
recipe's source. A recipe created without a web source omits it.

Ownership and storage metadata are outside the logical recipe document. The
storage design must preserve the application's private, owner-bound access
rules.

### Example: a meal

```json
{
  "id": "8c0fb550-686a-4a0c-bf8f-690c1359c877",
  "title": "Garlic fried rice",
  "description": "Fried rice made with cold, day-old rice.",
  "yield": { "amount": 4, "unit": "servings" },
  "time": {
    "prepMinutes": 15,
    "cookMinutes": 12,
    "totalMinutes": 27
  },
  "ingredients": [
    { "name": "cooked white rice", "amount": "6 cups", "note": "cooled" },
    { "name": "garlic", "amount": "3 cloves", "note": "minced" },
    { "name": "neutral oil", "amount": "2 tablespoons" },
    { "name": "soy sauce", "amount": "1–2 tablespoons" },
    { "name": "salt", "amount": "to taste" }
  ],
  "equipment": [{ "name": "wok", "note": "A large skillet also works." }, { "name": "spatula" }],
  "instructions": [
    "Break up any clumps of rice.",
    "Heat the wok and add the oil.",
    "Cook the garlic briefly, stirring until fragrant.",
    "Add the rice and stir-fry until hot and lightly toasted.",
    "Add soy sauce and season to taste."
  ],
  "notes": ["Work in two batches if the wok is crowded."],
  "tags": ["rice", "weeknight"],
  "sourceUrl": "https://example.com/garlic-fried-rice"
}
```

### Example: a baked good with unknown time

```json
{
  "id": "48858e4f-87e5-4077-818d-87e804511165",
  "title": "Orange shortbread",
  "description": "Crisp cookies with orange zest.",
  "yield": { "amount": 24, "unit": "cookies" },
  "time": { "cookMinutes": 18 },
  "ingredients": [
    { "name": "unsalted butter", "amount": "1 cup", "note": "softened" },
    { "name": "flour", "amount": "2 cups" },
    { "name": "orange zest", "amount": "zest of 1 orange" },
    { "name": "salt", "amount": "a pinch" }
  ],
  "equipment": [{ "name": "baking sheet" }, { "name": "parchment paper" }],
  "instructions": [
    "Cream the butter, then mix in the remaining ingredients.",
    "Shape the dough and chill until firm.",
    "Slice and bake until the edges are lightly golden."
  ],
  "notes": ["The dough can be chilled overnight."],
  "tags": ["baking", "cookies"]
}
```

### Example: a recipe with no stated yield

```json
{
  "id": "a75a85ad-7881-48a8-bd79-322087325b3c",
  "title": "Quick pickled onions",
  "description": "A small jar of tangy onions for tacos and salads.",
  "time": { "prepMinutes": 10 },
  "ingredients": [
    { "name": "red onion", "amount": "1", "note": "thinly sliced" },
    { "name": "vinegar", "amount": "1/2 cup" },
    { "name": "salt", "amount": "1 teaspoon" }
  ],
  "equipment": [{ "name": "jar" }],
  "instructions": [
    "Put the onion in the jar.",
    "Stir the vinegar and salt together, then pour over the onion.",
    "Refrigerate until the onion softens."
  ],
  "notes": [],
  "tags": ["condiments"]
}
```

A consumer handles recipes with or without a stated yield:

```tsx
function RecipeExcerpt({ recipe }: { recipe: RecipeDocument }) {
  return (
    <>
      <h1>{recipe.title}</h1>
      {recipe.yield && (
        <p>
          {recipe.yield.amount} {recipe.yield.unit}
        </p>
      )}
      <ol>
        {recipe.instructions.map((instruction, index) => (
          <li key={index}>{instruction}</li>
        ))}
      </ol>
    </>
  );
}
```

## Storage design: typed columns and JSONB structures

The database stores simple recipe values as columns and retains JSONB only for
the nested ingredient and equipment records:

```text
recipes
  id, owner_id, revision, created_at, updated_at   -- storage metadata
  title, description, source_url                   -- text
  prep_minutes, cook_minutes, total_minutes        -- nullable integers
  yield_amount                                     -- nullable numeric
  yield_unit                                       -- nullable text
  tags, notes, instructions                        -- ordered text[]
  ingredients, equipment                          -- JSONB arrays of objects
```

When there is no yield, both yield columns are null. When yield is present,
both columns are populated. Time values are independently nullable. Empty
string lists are stored as empty arrays. Ingredient and equipment JSONB arrays
retain their existing validated object shapes and ordering.

The repository assembles this storage shape into the existing recipe contract
and validates it before returning data to the service. The web app, HTTP API,
and MCP tools continue using the same recipe object. `owner_id`, revision, and
timestamps remain outside recipe content, with Clerk-bound RLS and the verified
MCP service-role boundary unchanged.

Search continues to match literal case-insensitive substrings in title,
description, ingredient names, equipment names, or tags. Notes and instructions
remain excluded. Tag filtering, inventory, and replacement read and update the
`tags` array; replacements remain owner-bound, atomic, and revisioned. The title
trigram index targets `title` directly. Add other indexes only when query plans
show a need.

An owner-bound consumer still calls the same service:

```ts
const snapshot = await recipeService.getDocument(ownerId, recipeId);
const prep = snapshot?.recipe.time.prepMinutes;
const firstIngredient = snapshot?.recipe.ingredients[0];
```

## Migration and rollout

A new forward migration converts each existing `document` to its columns,
checks reconstructed values against the source, and then removes `document`
and `title_text`. It preserves IDs, owners, timestamps, revisions, audit rows,
RLS, and RPC authorization. Earlier migrations remain immutable.

Pause recipe traffic while applying the schema migration and deploying the
matching repository version. Verify recipe CRUD, search, tag operations, owner
isolation, and MCP scopes before resuming traffic. The migration is not applied
to a hosted database by this implementation.
