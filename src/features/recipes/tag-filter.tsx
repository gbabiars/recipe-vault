"use client";

import { ComboboxField, type ComboboxOption } from "@/components/ui/combobox";

export async function loadOwnedTags(query: string, signal: AbortSignal): Promise<ComboboxOption[]> {
  const url = new URL("/api/v1/tags", window.location.origin);
  if (query) url.searchParams.set("search", query);
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("Could not load tags.");
  const payload = (await response.json()) as { data: Array<{ name: string }> };
  return payload.data.map(({ name }) => ({ value: name, label: name }));
}

export function TagFilter({ tag }: { tag?: string }) {
  return (
    <ComboboxField
      name="tag"
      label="Tag"
      defaultValue={tag ?? null}
      loadOptions={loadOwnedTags}
      loadOnEmpty
      helpText="Showing up to 25 tags. Type to narrow the list."
    />
  );
}
