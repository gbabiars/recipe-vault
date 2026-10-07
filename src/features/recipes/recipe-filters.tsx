"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { TextInput } from "@/components/ui/text-input";
import { TagFilter } from "./tag-filter";
import styles from "./recipe-filters.module.css";

const searchDebounceMs = 300;

export function RecipeFilters(props: { q?: string; tag?: string | string[] }) {
  const key = `${props.q ?? ""}\u0000${normalizeTags(props.tag).join("\u0000")}`;
  return <RecipeFiltersForm key={key} {...props} />;
}

function RecipeFiltersForm({ q, tag }: { q?: string; tag?: string | string[] }) {
  const router = useRouter();
  const [searchText, setSearchText] = useState(q ?? "");
  const [selectedTags, setSelectedTags] = useState(normalizeTags(tag));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSearchTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const applyFilters = useCallback(
    (search: string, tags: string[]) => {
      const params = new URLSearchParams();
      const normalizedSearch = search.trim();
      if (normalizedSearch) params.set("q", normalizedSearch);
      for (const selectedTag of tags) params.append("tag", selectedTag);
      const query = params.toString();
      router.replace(query ? `/recipes?${query}` : "/recipes", { scroll: false });
    },
    [router],
  );

  const applyImmediately = useCallback(() => {
    clearSearchTimer();
    applyFilters(searchText, selectedTags);
  }, [applyFilters, clearSearchTimer, searchText, selectedTags]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchText(value);
      clearSearchTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        applyFilters(value, selectedTags);
      }, searchDebounceMs);
    },
    [applyFilters, clearSearchTimer, selectedTags],
  );

  const handleTagChange = useCallback(
    (nextTags: string[]) => {
      setSelectedTags(nextTags);
      clearSearchTimer();
      applyFilters(searchText, nextTags);
    },
    [applyFilters, clearSearchTimer, searchText],
  );

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (
      event.key === "Enter" &&
      event.target instanceof HTMLInputElement &&
      event.target.name === "q"
    ) {
      event.preventDefault();
      applyImmediately();
    }
  }

  useEffect(() => clearSearchTimer, [clearSearchTimer]);

  return (
    <form
      onKeyDown={handleKeyDown}
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <Card variant="subtle" className={styles.card}>
        <div className={styles.fields}>
          <TextInput
            name="q"
            label="Search title"
            type="search"
            value={searchText}
            onValueChange={handleSearchChange}
          />
          <TagFilter value={selectedTags} onValueChange={handleTagChange} />
        </div>
      </Card>
    </form>
  );
}

function normalizeTags(tag?: string | string[]) {
  return tag == null ? [] : Array.isArray(tag) ? tag : [tag];
}
