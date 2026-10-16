"use client";

import { useState, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Grid } from "@/components/ui/grid";
import { Heading } from "@/components/ui/heading";
import { PageContent, PageHeader, PageLayout } from "@/components/ui/page-layout";
import { Stack } from "@/components/ui/stack";
import { Textarea } from "@/components/ui/textarea";
import { Text } from "@/components/ui/text";
import type { RecipeChatMessage } from "@/lib/recipes/recipe-chat-message";
import { ChatMessageBubble } from "./_components/chat-message-bubble";
import { RecipePreviewCard } from "./_components/recipe-preview-card";
import styles from "./page.module.css";

const chatTransport = new DefaultChatTransport<RecipeChatMessage>({
  api: "/api/v1/recipes/chat",
});

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [inputError, setInputError] = useState<string>();
  const { messages, sendMessage, status } = useChat<RecipeChatMessage>({
    transport: chatTransport,
  });

  const hasSearched = messages.some((message) => message.role === "user");
  const pending = status === "submitted" || status === "streaming";
  const canSubmit = query.trim().length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    if (!canSubmit) {
      setInputError("Enter a recipe or ingredient to search.");
      return;
    }

    const search = query.trim();

    setInputError(undefined);
    setQuery("");
    void sendMessage({ text: search });
  }

  return (
    <div className={`${styles.page} ${hasSearched ? styles.resultsPage : ""}`}>
      <PageLayout className={`${styles.content} ${hasSearched ? styles.resultsContent : ""}`}>
        {!hasSearched && <PageHeader title="What sounds good tonight?" />}
        <PageContent className={hasSearched ? styles.resultsPageContent : undefined}>
          <div className={`${styles.pageBody} ${hasSearched ? styles.resultsPageBody : ""}`}>
            {hasSearched && (
              <section aria-label="Conversation" aria-busy={pending} className={styles.results}>
                {messages.map((message) => {
                  if (message.role === "user") {
                    const text = message.parts
                      .flatMap((part) => (part.type === "text" ? [part.text] : []))
                      .join("");
                    return <ChatMessageBubble key={message.id} message={text} />;
                  }

                  const results = message.parts.find(
                    (part) => part.type === "data-recipe-search-results",
                  );
                  if (!results || results.type !== "data-recipe-search-results") return null;

                  return (
                    <div key={message.id}>
                      {results.data.recipes.length === 0 ? (
                        <Stack gap="100">
                          <Heading as="h2" level={5}>
                            No recipes found
                          </Heading>
                          <Text as="p" role="status" aria-live="polite">
                            Try a different ingredient or phrase.
                          </Text>
                        </Stack>
                      ) : (
                        <Stack gap="150">
                          <Text as="p" role="status" aria-live="polite">
                            Showing {results.data.recipes.length} of {results.data.total} recipes
                          </Text>
                          <Grid columns={{ minWidth: 280, max: 2 }} gap="200">
                            {results.data.recipes.map((recipe) => (
                              <RecipePreviewCard key={recipe.id} recipe={recipe} />
                            ))}
                          </Grid>
                        </Stack>
                      )}
                    </div>
                  );
                })}
                {pending ? (
                  <Text as="p" role="status" aria-live="polite">
                    Searching your recipes…
                  </Text>
                ) : status === "error" ? (
                  <Alert
                    title="Search could not be completed"
                    description="Please try again."
                    variant="danger"
                  />
                ) : null}
              </section>
            )}

            <form
              className={`${styles.composer} ${hasSearched ? styles.composerAtBottom : ""}`}
              onSubmit={handleSubmit}
            >
              <Textarea
                label="Search your recipes"
                visuallyHiddenLabel
                placeholder="Search by ingredient or recipe name..."
                required
                maxLength={200}
                error={inputError}
                value={query}
                onValueChange={(value) => {
                  setQuery(value);
                  setInputError(undefined);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={hasSearched ? 1 : 3}
                textareaClassName={styles.input}
              />
              <div className={styles.actions}>
                <Button
                  label="Search"
                  type="submit"
                  variant="primary"
                  pending={pending}
                  disabled={!canSubmit}
                />
              </div>
            </form>
          </div>
        </PageContent>
      </PageLayout>
    </div>
  );
}
