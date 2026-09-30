"use client";

import Link from "next/link";
import { useGateValue } from "@statsig/react-bindings";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuLinkItem,
  DropdownMenuPopup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function RecipesHeaderActions() {
  const websiteImportEnabled = useGateValue("Recipe_website_import");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button label="Add a recipe" />} />
      <DropdownMenuPopup align="end">
        <DropdownMenuLinkItem render={<Link href="/recipes/new" />}>
          Create manually
        </DropdownMenuLinkItem>
        {websiteImportEnabled && (
          <DropdownMenuLinkItem render={<Link href="/recipes/import" />}>
            Import from a website
          </DropdownMenuLinkItem>
        )}
      </DropdownMenuPopup>
    </DropdownMenu>
  );
}
