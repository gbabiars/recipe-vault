import { Button } from "@/components/ui/button";
import { Inline } from "@/components/ui/inline";
import { Text } from "@/components/ui/text";

export function RecipePagination({
  page,
  pageCount,
  total,
  previousHref,
  nextHref,
}: {
  page: number;
  pageCount: number;
  total: number;
  previousHref?: string;
  nextHref?: string;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav aria-label="Recipe pages">
      <Inline gap="100" justify="between" align="center">
        <Text size="small" appearance="secondary">
          Page {page} of {pageCount} · {total} {total === 1 ? "recipe" : "recipes"}
        </Text>
        <Inline gap="100">
          {previousHref && <Button label="Previous" href={previousHref} variant="subtle" />}
          {nextHref && <Button label="Next" href={nextHref} variant="subtle" />}
        </Inline>
      </Inline>
    </nav>
  );
}
