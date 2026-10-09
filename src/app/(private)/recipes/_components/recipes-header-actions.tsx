"use client";

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
        <DropdownMenuLinkItem href="/recipes/new">Create manually</DropdownMenuLinkItem>
        <DropdownMenuLinkItem href="/recipes/import">
          Import from website or PDF
        </DropdownMenuLinkItem>
      </DropdownMenuPopup>
    </DropdownMenu>
  );
}
