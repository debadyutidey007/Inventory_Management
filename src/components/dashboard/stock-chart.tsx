'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { Item } from '@/types';

type StockChartProps = {
  items: Item[];
};

export function StockChart({ items }: StockChartProps) {
  const chartData = items.slice(0, 10).map(item => ({
    name: item.name,
    quantity: item.quantity,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-bold">Stock Levels</CardTitle>
        <CardDescription>Top 10 items by quantity</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-64 w-full">
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 10) + (value.length > 10 ? '...' : '')}
            />
            <YAxis />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              content={<ChartTooltipContent />}
            />
            <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
