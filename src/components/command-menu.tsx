
"use client"

import * as React from "react"
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandDialogTitle,
} from "@/components/ui/command"
import type { Item, Category } from "@/types"
import { LayoutDashboard, Package, Shapes, FileText, Settings, User } from 'lucide-react';

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Item[];
  categories: Category[];
  router: AppRouterInstance;
}

export function CommandMenu({ open, onOpenChange, items, categories, router }: CommandMenuProps) {

  const runCommand = (command: () => unknown) => {
    onOpenChange(false)
    command()
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
       <CommandDialogTitle className="sr-only">Command Menu</CommandDialogTitle>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/items"))}>
            <Package className="mr-2 h-4 w-4" />
            <span>Items</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/categories"))}>
            <Shapes className="mr-2 h-4 w-4" />
            <span>Categories</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/reports"))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Reports</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Items">
          {items.map((item) => (
            <CommandItem
              key={item.id}
              value={`item-${item.id}-${item.name}`}
              onSelect={() => runCommand(() => router.push("/dashboard/items"))}
            >
              <Package className="mr-2 h-4 w-4" />
              <span>{item.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Categories">
          {categories.map((category) => (
            <CommandItem
              key={category.id}
              value={`category-${category.id}-${category.name}`}
              onSelect={() => runCommand(() => router.push("/dashboard/categories"))}
            >
              <Shapes className="mr-2 h-4 w-4" />
              <span>{category.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/settings"))}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
