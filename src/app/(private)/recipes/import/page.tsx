import Link from "next/link";
import { Breadcrumbs, BreadcrumbsItem } from "@/components/ui/breadcrumbs";
import { PageContent, PageHeader, PageLayout } from "@/components/ui/page-layout";
import { RecipeImportPageForm } from "@/features/recipes/recipe-import-form";
import { requireUser } from "@/lib/auth/require-user";

export default async function ImportRecipePage() {
  await requireUser();

  return (
    <PageLayout>
      <PageHeader
        title="Import from a website"
        overline={
          <Breadcrumbs trailingSeparator>
            <BreadcrumbsItem>
              <Link href="/recipes">Recipes</Link>
            </BreadcrumbsItem>
          </Breadcrumbs>
        }
      />
      <PageContent>
        <RecipeImportPageForm />
      </PageContent>
    </PageLayout>
  );
}
