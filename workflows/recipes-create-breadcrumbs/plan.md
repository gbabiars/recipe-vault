# Implementation plan: Create recipe breadcrumbs

Revision: 1

## Outcome

Render the same ancestor breadcrumb on `/recipes/new` that appears on other
recipe pages, while retaining the current “Create recipe” heading and form.

## Affected boundaries

- Route composition: `src/app/(private)/recipes/new/page.tsx`
- Route-level rendering coverage: `src/app/(private)/recipes/new/page.test.tsx`
- No domain, authentication, data, or component API changes.

The Next.js 16 page convention documentation was reviewed. The route remains a
server component and keeps its existing authentication call. Breadcrumb
composition follows the local Breadcrumbs guide and the import page pattern.

## Steps

1. Import `Breadcrumbs` and `BreadcrumbsItem` in the create page, then set the
   `PageHeader` overline to the existing trailing-separator pattern:

   ```tsx
   <PageHeader
     title="Create recipe"
     overline={
       <Breadcrumbs trailingSeparator>
         <BreadcrumbsItem href="/recipes">Recipes</BreadcrumbsItem>
       </Breadcrumbs>
     }
   />
   ```

2. Add a colocated route test that renders the real page and form, then verifies
   the “Create recipe” heading, the “Recipes” breadcrumb link and destination,
   and a representative recipe form control. Keep authentication mocked as a
   server boundary, following the import page test.

## Verification

- Run `pnpm format` after integrating edits.
- Run the focused browser component test for
  `src/app/(private)/recipes/new/page.test.tsx`.
- Run the Storybook component test and preview for the documented Breadcrumbs
  story used by the page, as required by the component guidance.
- Run `pnpm lint` and `pnpm typecheck` if the focused test or changed page
  surfaces issues; the change is limited to route composition and coverage.

## Completion criteria

- All intake acceptance criteria pass.
- No API, authentication, form, or data behavior changes.
