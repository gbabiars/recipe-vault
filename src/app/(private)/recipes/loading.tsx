import { Text } from "@/components/ui/text";

export default function RecipesLoading() {
  return (
    <Text as="p" aria-live="polite">
      Loading your recipes…
    </Text>
  );
}
