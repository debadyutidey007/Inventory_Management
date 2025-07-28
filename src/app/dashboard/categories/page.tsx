
"use client";

import * as React from 'react';
import { PageHeader } from "@/components/page-header";
import { CategoriesTable } from "@/components/dashboard/categories-table";
import type { Category } from "@/types";
import { Skeleton } from '@/components/ui/skeleton';
import { getCategories, saveCategories, getItems } from '@/lib/data';
import { v4 as uuidv4 } from 'uuid';

export default function CategoriesPage() {
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadedCategories = getCategories();
    const allItems = getItems();
    
    // Calculate item counts for each category
    const categoryItemCounts = allItems.reduce((acc: { [key: string]: number }, item: { categoryId: string }) => {
        if (item.categoryId) {
            acc[item.categoryId] = (acc[item.categoryId] || 0) + 1;
        }
        return acc;
    }, {});
    
    const categoriesWithCounts = loadedCategories.map((cat: Category) => ({
        ...cat,
        itemCount: categoryItemCounts[cat.id] || 0,
    }));

    setCategories(categoriesWithCounts);
    setIsLoading(false);
  }, []);

  const handleAddCategory = (newCategory: Omit<Category, 'id' | 'itemCount'>) => {
    const newCategoryWithId: Category = { ...newCategory, id: uuidv4(), itemCount: 0 };
    const updatedCategories = [...categories, newCategoryWithId];
    setCategories(updatedCategories);
    saveCategories(updatedCategories);
  };

  const handleEditCategory = (updatedCategory: Category) => {
    const updatedCategories = categories.map((cat) =>
      cat.id === updatedCategory.id ? updatedCategory : cat
    );
    setCategories(updatedCategories);
    saveCategories(updatedCategories);
  };

  const handleDeleteCategory = (categoryId: string) => {
    const updatedCategories = categories.filter((cat) => cat.id !== categoryId);
    setCategories(updatedCategories);
    saveCategories(updatedCategories);
  };
  
  if (isLoading) {
    return (
        <>
            <PageHeader
                title="Categories"
                description="Organize your items into categories."
            />
            <div className="w-full">
                <div className="flex items-center py-4">
                    <Skeleton className="h-10 w-full max-w-sm" />
                    <Skeleton className="ml-auto h-10 w-36" />
                </div>
                <Skeleton className="h-96 w-full rounded-md border" />
            </div>
        </>
    );
  }

  return (
    <>
      <PageHeader
        title="Categories"
        description="Organize your items into categories."
      />
      <CategoriesTable 
          categories={categories} 
          onAddCategory={handleAddCategory}
          onEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
        />
    </>
  );
}
