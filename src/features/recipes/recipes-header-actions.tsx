"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuLinkItem,
  DropdownMenuPopup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function RecipesHeaderActions() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button label="Add a recipe" />} />
      <DropdownMenuPopup align="end">
        <DropdownMenuLinkItem render={<Link href="/recipes/new" />}>
          Create manually
        </DropdownMenuLinkItem>
        <DropdownMenuLinkItem render={<Link href="/recipes/import" />}>
          Import from a website
        </DropdownMenuLinkItem>
      </DropdownMenuPopup>
    </DropdownMenu>
  );
}
