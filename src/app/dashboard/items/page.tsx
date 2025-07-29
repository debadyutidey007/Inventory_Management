
"use client";

import * as React from "react";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ItemsTable } from "@/components/dashboard/items-table";
import type { Item, Category, SoldItem } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { SoldItemsTable } from "@/components/dashboard/sold-items-table";
import { getItems, saveItems, getCategories, saveCategories, getSoldItems, saveSoldItems } from '@/lib/data';
import { v4 as uuidv4 } from 'uuid';
import { AIAlert } from "@/components/dashboard/ai-alert";

export default function ItemsPage() {
  const [items, setItems] = React.useState<Item[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [soldItems, setSoldItems] = React.useState<SoldItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [_, setForceUpdate] = React.useState(0);

  const getDeterministicItemData = (sku: string): Pick<Item, 'averageDailySales' | 'leadTimeDays'> => {
    const skuSeed = sku.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const averageDailySales = (skuSeed % 19) + 1; 
    const leadTimeDays = (skuSeed % 9) + 2; 
    return {
        averageDailySales,
        leadTimeDays,
    };
  };

  React.useEffect(() => {
    setItems(getItems());
    setCategories(getCategories());
    setSoldItems(getSoldItems());
    setIsLoading(false);
  }, []);

  const handleAddItem = (newItem: Omit<Item, "id" | "averageDailySales" | "leadTimeDays">) => {
    const deterministicData = getDeterministicItemData(newItem.sku);
    const newItemWithId: Item = { ...newItem, id: uuidv4(), ...deterministicData };
    const updatedItems = [...items, newItemWithId];
    setItems(updatedItems);
    saveItems(updatedItems);

    // Update category item count
    const updatedCategories = categories.map(cat => 
        cat.id === newItem.categoryId ? { ...cat, itemCount: (cat.itemCount || 0) + 1 } : cat
    );
    setCategories(updatedCategories);
    saveCategories(updatedCategories);
  };

  const handleEditItem = (updatedItem: Item) => {
    const updatedItems = items.map((item) =>
      item.id === updatedItem.id ? updatedItem : item
    );
    setItems(updatedItems);
    saveItems(updatedItems);
  };

  const handleDeleteItem = (itemId: string) => {
    const itemToDelete = items.find(item => item.id === itemId);
    const updatedItems = items.filter((item) => item.id !== itemId);
    setItems(updatedItems);
    saveItems(updatedItems);

    if (itemToDelete) {
        const updatedCategories = categories.map(cat => 
            cat.id === itemToDelete.categoryId ? { ...cat, itemCount: Math.max(0, (cat.itemCount || 0) - 1) } : cat
        );
        setCategories(updatedCategories);
        saveCategories(updatedCategories);
    }
  };

  const handleSellItem = (itemToSell: Item, quantitySold: number) => {
    // 1. Update the quantity of the original item
    const updatedItems = items.map(item => 
      item.id === itemToSell.id ? { ...item, quantity: item.quantity - quantitySold } : item
    );
    setItems(updatedItems);
    saveItems(updatedItems);

    // 2. Add a record to the sold items list
    const newSoldItem: SoldItem = {
      id: uuidv4(),
      itemId: itemToSell.id,
      name: itemToSell.name,
      sku: itemToSell.sku,
      quantitySold: quantitySold,
      price: itemToSell.price,
      dateSold: new Date().toISOString(),
    };
    const updatedSoldItems = [...soldItems, newSoldItem];
    setSoldItems(updatedSoldItems);
    saveSoldItems(updatedSoldItems);
    setForceUpdate(Date.now());
  };

  const lowStockItems = items.filter(
    (item) => item.quantity <= item.reorderPoint
  );
  
  if (isLoading) {
    return (
      <>
        <PageHeader
            title="Items"
            description="Manage your products and inventory."
        />
        <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <div className="flex items-center py-4">
                <Skeleton className="h-10 w-full max-w-sm" />
                <Skeleton className="ml-auto h-10 w-28" />
            </div>
            <Skeleton className="h-96 w-full rounded-md border" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Items"
        description="Manage your products and inventory."
      />
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Items</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
          <TabsTrigger value="sold">Sold Items</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <ItemsTable
            items={items}
            categories={categories}
            onAddItem={handleAddItem}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
            onSellItem={handleSellItem}
            view="all"
          />
        </TabsContent>
        <TabsContent value="low-stock">
          <div className="space-y-4">
            <AIAlert lowStockItems={lowStockItems} />
            <ItemsTable
              items={lowStockItems}
              categories={categories}
              onAddItem={handleAddItem}
              onEditItem={handleEditItem}
              onDeleteItem={handleDeleteItem}
              onSellItem={handleSellItem}
              view="low-stock"
            />
          </div>
        </TabsContent>
        <TabsContent value="sold">
          <SoldItemsTable items={soldItems} />
        </TabsContent>
      </Tabs>
    </>
  );
}
