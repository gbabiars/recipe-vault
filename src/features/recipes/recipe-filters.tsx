"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { TextInput } from "@/components/ui/text-input";
import { TagFilter } from "./tag-filter";
import styles from "./recipe-filters.module.css";

const searchDebounceMs = 300;

export function RecipeFilters(props: { q?: string; tag?: string | string[] }) {
  const { q, tag } = props;
  const router = useRouter();
  const [searchText, setSearchText] = useState(q ?? "");
  const [selectedTags, setSelectedTags] = useState(normalizeTags(tag));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAppliedFiltersRef = useRef<string | null>(null);

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
      lastAppliedFiltersRef.current = filtersKey(normalizedSearch, tags);
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

  useEffect(() => {
    const nextSearchText = q ?? "";
    const nextTags = normalizeTags(tag);
    const nextFiltersKey = filtersKey(nextSearchText, nextTags);

    if (lastAppliedFiltersRef.current === nextFiltersKey) {
      lastAppliedFiltersRef.current = null;
      return;
    }

    lastAppliedFiltersRef.current = null;
    clearSearchTimer();
    setSearchText((current) => (current === nextSearchText ? current : nextSearchText));
    setSelectedTags((current) => (areTagsEqual(current, nextTags) ? current : nextTags));
  }, [clearSearchTimer, q, tag]);

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

function filtersKey(search: string, tags: string[]) {
  return JSON.stringify([search, tags]);
}

function areTagsEqual(first: string[], second: string[]) {
  return first.length === second.length && first.every((tag, index) => tag === second[index]);
}
