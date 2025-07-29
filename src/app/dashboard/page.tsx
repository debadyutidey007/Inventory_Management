
"use client";

import * as React from 'react';
import { Suspense } from 'react';
import { Package, Shapes, DollarSign, PackageX, TrendingUp } from 'lucide-react';
import type { Item, Category, SoldItem } from '@/types';
import { getItems, getCategories, getSoldItems } from '@/lib/data';
import { StatCard } from '@/components/dashboard/stat-card';
import { StockChart } from '@/components/dashboard/stock-chart';
import { AIHealthReport } from '@/components/dashboard/ai-health-report';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/page-header';

export default function DashboardPage() {
  const [items, setItems] = React.useState<Item[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [soldItems, setSoldItems] = React.useState<SoldItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const getDeterministicItemData = (item: Omit<Item, 'averageDailySales' | 'leadTimeDays'>): Item => {
        const skuSeed = item.sku.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const averageDailySales = (skuSeed % 19) + 1; 
        const leadTimeDays = (skuSeed % 9) + 2; 
        return {
            ...item,
            averageDailySales,
            leadTimeDays,
        };
    };

    const loadedItems = getItems().map((item: Omit<Item, 'averageDailySales' | 'leadTimeDays'>) => getDeterministicItemData(item));
    setItems(loadedItems);
    setCategories(getCategories());
    setSoldItems(getSoldItems());
    setIsLoading(false);
  }, []);

  const totalItems = items.length;
  const lowStockItemsCount = items.filter(item => item.quantity === 0).length;
  const totalValue = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const totalRevenue = soldItems.reduce((sum, item) => sum + item.quantitySold * item.price, 0);
  const categoryCount = categories.length;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Dashboard" description="An overview of your inventory." />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-7">
          <div className="lg:col-span-4">
              <Skeleton className="h-[400px] rounded-lg" />
          </div>
          <div className="lg:col-span-3">
            <Skeleton className="h-[400px] rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="An overview of your inventory." />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Items"
          value={totalItems.toLocaleString()}
          icon={Package}
        />
        <StatCard
          title="Low Stock Items"
          value={lowStockItemsCount.toString()}
          icon={PackageX}
        />
        <StatCard
          title="Inventory Value"
          value={`$${totalValue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          icon={DollarSign}
        />
        <StatCard
          title="Categories"
          value={categoryCount.toString()}
          icon={Shapes}
        />
        <StatCard
          title="Total Revenue Generated"
          value={`$${totalRevenue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          icon={TrendingUp}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4">
            <StockChart items={items} />
        </div>
        <div className="lg:col-span-3">
          <Suspense fallback={<Skeleton className="h-full w-full rounded-lg" />}>
            <AIHealthReport allItems={items} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
