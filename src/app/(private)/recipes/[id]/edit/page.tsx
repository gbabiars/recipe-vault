import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs, BreadcrumbsItem } from "@/components/ui/breadcrumbs";
import { requireUser } from "@/lib/auth/require-user";
import { getRecipeService } from "@/lib/recipes";
import { RecipeForm } from "@/features/recipes/recipe-form";
import { saveRecipeAction } from "@/features/recipes/actions";
import { PageContent, PageHeader, PageLayout } from "@/components/ui/page-layout";
export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const recipe = await (await getRecipeService()).get(user.id, id);
  if (!recipe) notFound();
  return (
    <PageLayout>
      <PageHeader
        title="Edit recipe"
        overline={
          <Breadcrumbs trailingSeparator>
            <BreadcrumbsItem>
              <Link href="/recipes">Recipes</Link>
            </BreadcrumbsItem>
            <BreadcrumbsItem>
              <Link href={`/recipes/${recipe.id}`}>{recipe.title}</Link>
            </BreadcrumbsItem>
          </Breadcrumbs>
        }
      />
      <PageContent>
        <RecipeForm recipe={recipe} saveAction={saveRecipeAction} />
      </PageContent>
    </PageLayout>
  );
}
