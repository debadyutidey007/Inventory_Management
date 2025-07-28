
"use client";

import * as React from 'react';
import { generateStockAlert, type GenerateStockAlertOutput } from '@/ai/flows/generate-stock-alert';
import type { Item } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, TrendingUp, DollarSign, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

type AIAlertProps = {
  lowStockItems: Item[];
};

export function AIAlert({ lowStockItems }: AIAlertProps) {
  const [alert, setAlert] = React.useState<GenerateStockAlertOutput | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchAlert = async () => {
      if (lowStockItems.length === 0) {
        setIsLoading(false);
        setAlert(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      const alertInput = {
        lowStockItems: lowStockItems.map(item => ({
          itemId: item.id,
          itemName: item.name,
          currentQuantity: item.quantity,
          reorderPoint: item.reorderPoint,
          averageDailySales: item.averageDailySales,
          sellingPrice: item.price,
          supplierName: item.supplierName,
          leadTimeDays: item.leadTimeDays,
        })),
      };

      try {
        const result = await generateStockAlert(alertInput);
        setAlert(result);
      } catch (e) {
        console.error('Error generating AI stock alert:', e);
        setError('There was an issue with the AI service. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlert();
  }, [lowStockItems]);

  if (lowStockItems.length === 0) {
    return null; // Don't render anything if there are no low stock items
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <CardTitle className="font-bold text-destructive">Could not generate AI Alert</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!alert) {
    return null;
  }
  
  const getDisruptionBadgeVariant = (level: 'Low' | 'Medium' | 'High') => {
    switch (level) {
        case 'High': return 'destructive';
        case 'Medium': return 'outline';
        default: return 'secondary';
    }
  }

  return (
    <Card className="border-primary/50 bg-primary/5 h-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-primary" />
          <CardTitle className="font-bold text-primary">AI - Powered Stock Analysis</CardTitle>
          <Badge variant="default" className="ml-auto">AI-Powered</Badge>
        </div>
        <CardDescription className="pt-2 text-primary/90">
          Prioritized insights to prevent stockouts and revenue loss.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 text-center">
            <div className="rounded-lg bg-background p-3">
                <p className="text-sm font-medium text-muted-foreground">Disruption Level</p>
                <Badge variant={getDisruptionBadgeVariant(alert.overallDisruptionLevel)} className="mt-1 text-lg">
                    {alert.overallDisruptionLevel}
                </Badge>
            </div>
            <div className="rounded-lg bg-background p-3">
                <p className="text-sm font-medium text-muted-foreground">Revenue at Risk</p>
                <p className="text-xl font-bold text-primary">
                    ${alert.potentialRevenueLoss.toLocaleString()}
                </p>
            </div>
        </div>
        
        <div>
            <h4 className="font-semibold text-foreground mb-2">Suggested Actions (by priority)</h4>
            <div className="w-full overflow-hidden rounded-md border bg-background">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[30px] text-center">#</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {alert.suggestedActions.sort((a,b) => a.priority - b.priority).map((action, index) => (
                            <TableRow key={`${action.itemName}-${index}`}>
                                <TableCell className="text-center font-bold text-primary">{action.priority}</TableCell>
                                <TableCell className="font-medium">{action.itemName}</TableCell>
                                <TableCell>{action.action}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
