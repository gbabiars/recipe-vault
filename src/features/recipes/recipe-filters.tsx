import Form from "next/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextInput } from "@/components/ui/text-input";
import { TagFilter } from "./tag-filter";
import styles from "./recipe-filters.module.css";

export function RecipeFilters({ q, tag }: { q?: string; tag?: string | string[] }) {
  return (
    <Form action="/recipes" scroll={false}>
      <Card variant="subtle" className={styles.card}>
        <div className={styles.fields}>
          <TextInput name="q" label="Search title" type="search" defaultValue={q} />
          <TagFilter tag={tag} />
          <div className={styles.action}>
            <Button label="Filter" type="submit" />
          </div>
        </div>
      </Card>
    </Form>
  );
}
