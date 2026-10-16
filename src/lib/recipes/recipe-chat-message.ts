import type { UIMessage } from "ai";
import type { RecipeSummary } from "@/lib/db/recipe-repository";

export type RecipeChatData = {
  "recipe-search-results": {
    recipes: RecipeSummary[];
    total: number;
  };
};

export type RecipeChatMessage = UIMessage<never, RecipeChatData>;
