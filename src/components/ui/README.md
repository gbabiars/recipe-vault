# UI intent index

Choose by the job the UI must do, then read the linked family guide and its
Storybook story. Each MDX guide is colocated with the component source and is the
authority for component choices, composition, content, and caller accessibility.
The exported TypeScript types remain the authority for exact prop signatures.

| Intent                                     | Public components                                                                                      | Guidance and stories                                                                                                                                                 | Current application use                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Communicate a status or provide context    | `Alert`                                                                                                | [Alert](alert/alert.mdx), [stories](alert/alert.stories.tsx)                                                                                                         | Stories only                                                                |
| Represent a person                         | `Avatar`                                                                                               | [Avatar](avatar/avatar.mdx), [stories](avatar/avatar.stories.tsx)                                                                                                    | Stories only                                                                |
| Trigger an action                          | `Button`, `IconButton`                                                                                 | [Button](button/button.mdx), [IconButton](button/icon-button.mdx), [Button stories](button/button.stories.tsx), [IconButton stories](button/icon-button.stories.tsx) | Button: recipe form, filters, delete confirmation; IconButton: stories only |
| Navigate with button styling               | `ButtonLink`                                                                                           | [ButtonLink](button/button-link.mdx), [stories](button/button-link.stories.tsx)                                                                                      | Create and edit recipe links                                                |
| Offer secondary actions or navigation      | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuPopup`, `DropdownMenuItem`, `DropdownMenuLinkItem` | [Dropdown menu](dropdown-menu/dropdown-menu.mdx), [stories](dropdown-menu/dropdown-menu.stories.tsx)                                                                 | Stories only                                                                |
| Show a page's place in a hierarchy         | `Breadcrumbs`, `BreadcrumbsItem`                                                                       | [Breadcrumbs](breadcrumbs/breadcrumbs.mdx), [stories](breadcrumbs/breadcrumbs.stories.tsx)                                                                           | Stories only; ready for `PageHeader.overline`                               |
| Group content or offer a whole-card action | `Card`                                                                                                 | [Card](card/card.mdx), [stories](card/card.stories.tsx)                                                                                                              | Recipe lists and details, settings                                          |
| Choose independent values                  | `CheckboxInput`, `CheckboxGroup`, `CheckboxGroupItem`                                                  | [Checkbox](checkbox/checkbox.mdx), [input stories](checkbox/checkbox-input.stories.tsx), [group stories](checkbox/checkbox-group.stories.tsx)                        | Delete confirmation uses `CheckboxInput`; group has stories only            |
| Display a compact label                    | `Chip`                                                                                                 | [Chip](chip/chip.mdx), [stories](chip/chip.stories.tsx)                                                                                                              | Recipe tags                                                                 |
| Search and choose labeled values           | `ComboboxField`                                                                                        | [Combobox](combobox/combobox.mdx), [stories](combobox/combobox.stories.tsx)                                                                                          | Reusable form field; no recipe form use yet                                 |
| Compose a custom form field                | `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldItem`, `Fieldset`, `FieldsetLegend`     | [Field](field/field.mdx), [stories](field/field.stories.tsx)                                                                                                         | Used by choice and text controls internally                                 |
| Lay out columns                            | `Grid`, `GridItem`                                                                                     | [Grid](grid/grid.mdx), [stories](grid/grid.stories.tsx)                                                                                                              | Stories only; recipe list currently uses feature styling                    |
| Introduce a section                        | `Heading`                                                                                              | [Heading](heading/heading.mdx), [stories](heading/heading.stories.tsx)                                                                                               | Recipe cards and forms, settings                                            |
| Lay out a row                              | `Inline`                                                                                               | [Inline](inline/inline.mdx), [stories](inline/inline.stories.tsx)                                                                                                    | Recipe metadata and delete actions                                          |
| Compose a private page                     | `PageLayout`, `PageHeader`, `PageContent`                                                              | [Page layout](page-layout/page-layout.mdx), [stories](page-layout/page-layout.stories.tsx)                                                                           | Private recipe, settings, and profile pages                                 |
| Choose one value                           | `RadioGroup`, `RadioGroupItem`                                                                         | [Radio](radio/radio.mdx), [stories](radio/radio.stories.tsx)                                                                                                         | Stories only                                                                |
| Lay out a column                           | `Stack`                                                                                                | [Stack](stack/stack.mdx), [stories](stack/stack.stories.tsx)                                                                                                         | Recipe cards and forms                                                      |
| Collect one line or search text            | `TextInput`                                                                                            | [Text input](text-input/text-input.mdx), [stories](text-input/text-input.stories.tsx)                                                                                | Recipe title and filters                                                    |
| Render supporting text                     | `Text`                                                                                                 | [Text](text/text.mdx), [stories](text/text.stories.tsx)                                                                                                              | Recipe summaries and metadata                                               |
| Collect long text                          | `Textarea`                                                                                             | [Textarea](textarea/textarea.mdx), [stories](textarea/textarea.stories.tsx)                                                                                          | Recipe notes                                                                |

`layout.ts` also exports `LayoutGap`, `LayoutAlign`, and `LayoutJustify` types
used by layout components. See [token usage](tokens.mdx) for their relationship
to CSS tokens.

## Existing compositions

- **Page header:** `PageLayout` contains `PageHeader` and `PageContent`; the
  header owns the page title and optional actions. Put `Breadcrumbs` in its
  overline for hierarchical navigation. See [page layout](page-layout/page-layout.mdx)
  and [breadcrumbs](breadcrumbs/breadcrumbs.mdx).
- **Form field:** Prefer `TextInput`, `Textarea`, or a labeled choice. Compose
  `Field` parts for an unusual control. See [field](field/field.mdx).
- **Action:** Use `Button` for labeled actions, `IconButton` for compact
  icon-only actions with a clear accessible label, and `ButtonLink` for
  navigation. See [Button](button/button.mdx),
  [IconButton](button/icon-button.mdx), and
  [ButtonLink](button/button-link.mdx).
- **Secondary actions and navigation:** Use `DropdownMenu` when several
  secondary actions or destinations belong under one trigger. See
  [Dropdown menu](dropdown-menu/dropdown-menu.mdx).
- **Card and list:** `Card` can be a list item with a primary link; arrange its
  title, summary, metadata, and chips with `Stack` and `Inline`. See
  [card](card/card.mdx) and the existing
  [recipe list card story](../../features/recipes/recipe-list-card.stories.tsx).

## Open questions

- The product has no published rule for how many actions a page header may hold,
  or which action should be emphasized when several are present.
- The current UI does not settle when a recipe list should switch from its
  feature-specific layout to `Grid`, or what its minimum card width should be.
- The visual priority between `default`, `primary`, and `subtle` actions across
  every workflow has not been specified beyond their current component styling
  and uses.
- No product-level rule yet defines when to hide a field label visually. The
  caller must still provide an accessible label.
