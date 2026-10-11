# Recipe document schema and storage plan

Status: the logical recipe schema is agreed. The JSONB storage design and migration plan are proposed; no database or application migration has started.

## Agreed recipe schema

```ts
type RecipeDocument = {
  id: string; // Unique and immutable
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

A recipe's `id` is unique and immutable. A complete recipe has a nonempty title,
a positive yield amount, at least one ingredient, and at least one instruction.
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

A consumer reads either document the same way:

```tsx
<h1>{recipe.title}</h1>
<p>{recipe.yield.amount} {recipe.yield.unit}</p>
<ol>
  {recipe.instructions.map((instruction, index) => (
    <li key={index}>{instruction}</li>
  ))}
</ol>
```

## Storage design: one document, targeted projections

The proposed Postgres row is:

```text
recipes
  id            uuid primary key
  owner_id      text not null
  document      jsonb not null
  revision      integer not null
  created_at    timestamptz not null
  updated_at    timestamptz not null
  title_text    text               -- derived from document.title
```

`document` holds the recipe fields other than `id`. Reading a row assembles `{ id: row.id, ...row.document }`, so the app still sees exactly the agreed schema. `owner_id` stays outside user-controlled JSON so existing Clerk-bound RLS can protect the row. `revision` and timestamps are storage metadata.

**One owned recipe takes one row read.** For listing, the app can select `id`, `title_text`, `updated_at`, and a few expressions from `document` rather than sending every instruction and ingredient. For editing, it validates and replaces the complete document, conditional on the expected `revision`.

| Query                              | Proposed path                                                        |
| ---------------------------------- | -------------------------------------------------------------------- |
| Open a recipe                      | Primary key plus `owner_id`; return its JSONB document               |
| List recent recipes                | Index on `(owner_id, updated_at, id)`                                |
| Search title as the app does today | Derived `title_text` with a suitable substring-search index          |
| Filter by tag                      | Existing owner-scoped tag associations                               |
| Search ingredient names later      | Add a targeted search projection when its matching rules are defined |

This avoids a blanket index over every JSON value. Postgres can index JSONB containment, but title substring and text search use different indexes; targeted projections make the intended search behavior clearer. [PostgreSQL JSON indexing](https://www.postgresql.org/docs/current/datatype-json.html#JSON-INDEXING), [Supabase full-text search](https://supabase.com/docs/guides/database/full-text-search).

**Tags need special handling.** Recipe Vault already has tag IDs, descriptions, unused tags, and merge behavior. I would retain that owner-scoped catalog and its associations. `document.tags` would be the readable name projection in the recipe document. Recipe saves, tag renames, and merges must update the associations and document together in one transaction. That preserves those existing features without asking JSON alone to represent an unused tag.

## Incremental implementation plan

1. **Audit existing recipes and define the conversion.** Map `summary → description`, `servings → yield`, ingredient rows → ordered array, steps → instruction strings, recipe notes → an array, and missing equipment → `[]`. Count records with no servings and steps with `durationMinutes`; those values have no lossless destination in the agreed schema. Settle their handling before backfill. Do not invent a yield.

2. **Add document storage beside the current model.** Add the JSONB field and metadata while retaining existing columns and tables. Validate document structure at the application boundary and keep `id` and `owner_id` database-controlled. Preserve RLS and the verified MCP credential boundary.

3. **Backfill and compare.** Convert existing recipes in batches. Compare every converted document with its source rows, including ingredient order, step order, tags, notes, and source URL. Keep old reads available until the comparison passes.

4. **Move reads, then writes.** Change the repository to return documents. Change create/update to validate and save the whole document and tag associations transactionally. Use `revision` to reject an edit based on an older copy. Update web, API, import, and MCP consumers through the recipe service.

5. **Add only the indexes needed for current queries.** Preserve title substring search, tag filtering, and recent ordering. Check representative query plans. Define ingredient or broader full-text search as a separate product decision, then add its projection and index.

6. **Remove the old recipe representation after verification.** Run focused migration and RLS tests, API and MCP tests, and checks for the affected UI. Have an independent reviewer trace owner binding, tag synchronization, and service-role access before removing old storage.

The **schema is agreed**. The storage design above is the recommended plan, with two migration decisions still requiring a rule: recipes without servings, and existing per-step durations. No database or application migration has started.
