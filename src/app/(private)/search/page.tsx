"use client";

import { Button } from "@/components/ui/button";
import { PageContent, PageHeader, PageLayout } from "@/components/ui/page-layout";
import { Textarea } from "@/components/ui/textarea";
import styles from "./page.module.css";

export default function SearchPage() {
  return (
    <div className={styles.page}>
      <PageLayout className={styles.content}>
        <PageHeader title="What sounds good tonight?" />
        <PageContent>
          <form className={styles.composer} onSubmit={(event) => event.preventDefault()}>
            <Textarea
              label="Search your recipes"
              visuallyHiddenLabel
              placeholder="Ask for a recipe or ingredient..."
              rows={3}
              textareaClassName={styles.input}
            />
            <div className={styles.actions}>
              <Button label="Search" type="submit" variant="primary" />
            </div>
          </form>
        </PageContent>
      </PageLayout>
    </div>
  );
}
