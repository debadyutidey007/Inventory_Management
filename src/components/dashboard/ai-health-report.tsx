
"use client";

import * as React from 'react';
import { generateInventoryAnalysis, type GenerateInventoryAnalysisOutput } from '@/ai/flows/generate-inventory-analysis';
import type { Item } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Zap, CheckCircle, TrendingDown, TrendingUp, PackageX, HelpCircle, Lightbulb, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Progress } from '../ui/progress';

type AIHealthReportProps = {
  allItems: Item[];
};

export function AIHealthReport({ allItems }: AIHealthReportProps) {
  const [report, setReport] = React.useState<GenerateInventoryAnalysisOutput | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  const fetchReport = React.useCallback(async () => {
    if (allItems.length === 0) {
      setIsLoading(false);
      setReport(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    const reportInput = {
      inventoryItems: allItems.map(item => ({
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
      const result = await generateInventoryAnalysis(reportInput);
      setReport(result);
      setError(null);
    } catch (e: any) {
      console.error('Error generating AI health report:', e);
      if (e.message?.includes('503')) {
        setError('The AI service is currently busy. It will automatically retry in a few seconds.');
        // Automatically retry after a delay
        setTimeout(() => setRetryCount(prev => prev + 1), 5000); 
      } else {
        setError('There was an issue with the AI service. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allItems, retryCount]);


  React.useEffect(() => {
    // Debounce the fetchReport call
    const handler = setTimeout(() => {
        fetchReport();
    }, 500);

    return () => {
        clearTimeout(handler);
    };
  }, [fetchReport]);

  if (allItems.length === 0) {
    return (
        <Card className="border-primary/50 bg-primary/5 h-full">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Zap className="h-6 w-6 text-primary" />
                    <CardTitle className="font-bold text-primary">AI Inventory Analysis</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center text-center h-full p-8">
                    <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">No Inventory Data</h3>
                    <p className="text-muted-foreground text-sm">Add items to your inventory to get started with AI analysis.</p>
                </div>
            </CardContent>
        </Card>
    )
  }

  if (isLoading && !error) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    const isRetrying = error.includes('retry');
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <CardTitle className="font-bold text-destructive">Could not generate AI Report</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
            <div className='flex items-start gap-2'>
              {isRetrying && <RefreshCw className="h-4 w-4 text-destructive animate-spin mt-1" />}
              <p className="text-sm text-destructive">{error}</p>
            </div>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return null;
  }
  
  const getHealthScoreColor = (score: number) => {
    if (score > 80) return 'text-green-500';
    if (score > 50) return 'text-yellow-500';
    return 'text-red-500';
  }
  
  const iconMap: { [key: string]: React.ElementType } = {
    'Best Sellers': TrendingUp,
    'Slow Movers': TrendingDown,
    'Recommendations': Lightbulb,
    'default': CheckCircle
  }

  return (
    <Card className="border-primary/50 bg-primary/5 h-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-primary" />
          <CardTitle className="font-bold text-primary">AI Inventory Health</CardTitle>
          <Badge variant="default" className="ml-auto">AI-Powered</Badge>
        </div>
        <CardDescription className="pt-2 text-primary/90">
          A strategic overview of your inventory performance and opportunities.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center rounded-lg bg-background p-3 space-y-2">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Overall Health Score</p>
                <p className={`text-2xl font-bold ${getHealthScoreColor(report.overallHealthScore)}`}>
                    {report.overallHealthScore} <span className="text-base text-muted-foreground">/ 100</span>
                </p>
            </div>
            <Progress value={report.overallHealthScore} />
        </div>
        <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
          {report.analysis.map((section, index) => {
            const Icon = iconMap[section.title] || iconMap.default;
            return (
              <AccordionItem value={`item-${index}`} key={index}>
                <AccordionTrigger>
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-foreground">{section.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                    {section.points.map((point, pIndex) => (
                      <li key={pIndex}>{point}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          })}
           {report.lowStockItems && report.lowStockItems.length > 0 && (
                <AccordionItem value="low-stock-items">
                    <AccordionTrigger>
                        <div className="flex items-center gap-3">
                            <PackageX className="h-5 w-5 text-primary" />
                            <span className="font-semibold text-foreground">Low Stock Items</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {report.lowStockItems.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </AccordionContent>
                </AccordionItem>
           )}
           {report.inStockItems && report.inStockItems.length > 0 && (
                <AccordionItem value="in-stock-items">
                    <AccordionTrigger>
                        <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-primary" />
                            <span className="font-semibold text-foreground">In-Stock Items</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {report.inStockItems.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </AccordionContent>
                </AccordionItem>
           )}
        </Accordion>
      </CardContent>
    </Card>
  );
}
