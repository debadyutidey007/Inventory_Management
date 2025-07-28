
"use client";

import * as React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, FileDown } from 'lucide-react';
import type { Item, Category, SoldItem } from "@/types";
import { generateInventoryAnalysis, type GenerateInventoryAnalysisOutput } from '@/ai/flows/generate-inventory-analysis';
import { getItems, getCategories, getSoldItems } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';

export default function ReportsPage() {
    const [items, setItems] = React.useState<Item[]>([]);
    const [categories, setCategories] = React.useState<Category[]>([]);
    const [soldItems, setSoldItems] = React.useState<SoldItem[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [aiReport, setAiReport] = React.useState<GenerateInventoryAnalysisOutput | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        setItems(getItems());
        setCategories(getCategories());
        setSoldItems(getSoldItems());
        setIsLoading(false);
    }, []);

    React.useEffect(() => {
        const fetchReport = async () => {
          if (items.length === 0) {
            setAiReport(null);
            return;
          }
    
          setIsGenerating(true);
          setError(null);
          const reportInput = {
            inventoryItems: items.map(item => ({
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
            setAiReport(result);
          } catch (e) {
            console.error('Error generating AI health report:', e);
            setError('There was an issue with the AI service. Please try again later.');
          } finally {
            setIsGenerating(false);
          }
        };
    
        if(!isLoading) {
            fetchReport();
        }
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [items, isLoading]);


    const lowStockItems = items.filter(item => item.quantity === 0);
    const inStockItems = items.filter(item => item.quantity > 0);
    const totalRevenue = soldItems.reduce((sum, item) => sum + item.price * item.quantitySold, 0);

    const setupPdfDoc = (doc: jsPDF) => {
        const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.get("height");
        const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.get("width");
        const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const margin = 14;
        
        const header = (data: any) => {
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor('#0C7FF2');
            doc.text("Inventory Manager", margin, 22);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor('#333333');
            doc.text(`Report Generated: ${reportDate}`, pageWidth - margin, 22, { align: 'right' });
            
            doc.setLineWidth(0.5);
            doc.setDrawColor('#0C7FF2');
            doc.line(margin, 28, pageWidth - margin, 28);
        };

        const addWatermark = () => {
            doc.saveGraphicsState();
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(72);
            doc.setTextColor('#000000');
            doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
            doc.text("Confidential", pageWidth / 2, pageHeight / 2, {
                angle: -45,
                align: 'center'
            });
            doc.restoreGraphicsState();
        };

        const addPageNumbers = () => {
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                addWatermark(); // Apply watermark to each page
                doc.setFontSize(8);
                doc.setTextColor('#888888');
                doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            }
        };

        return { header, addPageNumbers, margin, pageWidth, pageHeight };
    };

    const exportLowStockPDF = () => {
        const doc = new jsPDF();
        const { header, addPageNumbers, margin, pageWidth } = setupPdfDoc(doc);
        
        autoTable(doc, {
            head: [['Item Name', 'SKU', 'Re-order Point', 'Supplier']],
            body: lowStockItems.map(item => [item.name, item.sku, item.reorderPoint, item.supplierName]),
            theme: 'striped',
            headStyles: { fillColor: [12, 127, 242] },
            didDrawPage: (data) => {
                header(data);
                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                doc.text("Low Stock Report", margin, 40);
                const lowStockText = `The following items have a quantity of 0 and require immediate attention.`;
                const splitLowStockText = doc.splitTextToSize(lowStockText, pageWidth - margin * 2);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                doc.text(splitLowStockText, margin, 50);
            },
            startY: 60,
            margin: { top: 35, left: margin, right: margin }
        });

        addPageNumbers();
        doc.save(`low-stock-report-${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const exportLowStockExcel = () => {
        const wb = XLSX.utils.book_new();
        const ws_low_stock = XLSX.utils.json_to_sheet(lowStockItems.map(item => ({
            Name: item.name,
            SKU: item.sku,
            Quantity: item.quantity,
            'Re-order Point': item.reorderPoint,
            'Supplier Name': item.supplierName
        })));
        XLSX.utils.book_append_sheet(wb, ws_low_stock, "Low Stock Items");
        XLSX.writeFile(wb, `low-stock-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportFullInventoryPDF = () => {
        const doc = new jsPDF();
        const { header, addPageNumbers, margin, pageWidth } = setupPdfDoc(doc);
        
        autoTable(doc, {
            head: [['Item Name', 'SKU', 'Category', 'Quantity', 'Unit Price']],
            body: items.map(item => [item.name, item.sku, categories.find(c => c.id === item.categoryId)?.name || 'N/A', item.quantity, `$${item.price.toFixed(2)}`]),
            theme: 'striped',
            headStyles: { fillColor: [12, 127, 242] },
            didDrawPage: (data) => {
                header(data);
                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                doc.text("Full Inventory Report", margin, 40);
                const fullInvText = `A complete list of all items currently in the inventory, including stock levels and pricing.`;
                const splitFullInvText = doc.splitTextToSize(fullInvText, pageWidth - margin * 2);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                doc.text(splitFullInvText, margin, 50);
            },
            startY: 60,
            margin: { top: 35, left: margin, right: margin }
        });
        
        addPageNumbers();
        doc.save(`full-inventory-report-${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const exportFullInventoryExcel = () => {
        const wb = XLSX.utils.book_new();
        const ws_inventory = XLSX.utils.json_to_sheet(items.map(item => ({
            Name: item.name,
            SKU: item.sku,
            Category: categories.find(c => c.id === item.categoryId)?.name || 'N/A',
            Quantity: item.quantity,
            Price: item.price,
            'Re-order Point': item.reorderPoint,
            'Supplier Name': item.supplierName
        })));
        XLSX.utils.book_append_sheet(wb, ws_inventory, "Full Inventory");
        XLSX.writeFile(wb, `full-inventory-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportSoldItemsPDF = () => {
        const doc = new jsPDF();
        const { header, addPageNumbers, margin, pageWidth } = setupPdfDoc(doc);
        
        autoTable(doc, {
            head: [['Item Name', 'SKU', 'Qty Sold', 'Unit Price', 'Total Revenue', 'Date Sold']],
            body: soldItems.map(item => [
                item.name, 
                item.sku, 
                item.quantitySold, 
                `$${item.price.toFixed(2)}`,
                `$${(item.price * item.quantitySold).toFixed(2)}`,
                format(new Date(item.dateSold), 'PPP')
            ]),
            foot: [
                [{ content: 'Total Revenue', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, 
                 { content: `$${totalRevenue.toFixed(2)}`, styles: { fontStyle: 'bold' } }, 
                 '']
            ],
            theme: 'striped',
            headStyles: { fillColor: [12, 127, 242] },
            footStyles: { fillColor: [248, 250, 252], textColor: [0,0,0] },
            didDrawPage: (data) => {
                header(data);
                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                doc.text("Sold Items Report", margin, 40);
                const introText = `A complete history of all sold items.`;
                const splitIntroText = doc.splitTextToSize(introText, pageWidth - margin * 2);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                doc.text(splitIntroText, margin, 50);
            },
            startY: 60,
            margin: { top: 35, left: margin, right: margin }
        });
        
        addPageNumbers();
        doc.save(`sold-items-report-${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const exportSoldItemsExcel = () => {
        const wb = XLSX.utils.book_new();
        const soldData = soldItems.map(item => ({
            'Item Name': item.name,
            'SKU': item.sku,
            'Quantity Sold': item.quantitySold,
            'Price per Item': item.price,
            'Total Revenue': item.price * item.quantitySold,
            'Date Sold': format(new Date(item.dateSold), 'PPP')
        }));

        const ws = XLSX.utils.json_to_sheet(soldData);

        XLSX.utils.sheet_add_aoa(ws, [
            ["", "", "", "Total Revenue", totalRevenue]
        ], { origin: -1 });

        XLSX.utils.book_append_sheet(wb, ws, "Sold Items");
        XLSX.writeFile(wb, `sold-items-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportConsolidatedPDF = async () => {
        if (!aiReport) return;
        setIsGenerating(true);
        const doc = new jsPDF();
        const { header, addPageNumbers, margin, pageWidth, pageHeight } = setupPdfDoc(doc);
        let finalY = 0;

        const pageSetup = (data: any) => {
            header(data);
            finalY = data.cursor?.y || 0;
        };
        
        // --- Title Page ---
        header({} as any);
        doc.setFontSize(26);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#0C7FF2');
        doc.text("Comprehensive Inventory Analysis", margin, 40);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor('#333333');
        const summaryText = `This report provides a holistic overview of the inventory status, including an AI-powered health analysis, stock level visualizations, detailed item lists, and actionable insights.`;
        const splitSummary = doc.splitTextToSize(summaryText, pageWidth - margin * 2);
        doc.text(splitSummary, margin, 55);

        let currentY = 80;

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text("Stock Levels: Top 10 Items by Quantity", margin, currentY);
        currentY += 15;

        // --- Stock Level Chart ---
        const chartData = [...items].sort((a, b) => b.quantity - a.quantity).slice(0, 10);
        if (chartData.length > 0) {
            const chartX = margin + 10;
            const chartStartY = currentY;
            const chartHeight = 80;
            const chartWidth = pageWidth - (margin * 2) - 20;
            
            const maxQuantity = Math.max(...chartData.map(d => d.quantity), 0);
            const barWidth = chartWidth / (chartData.length * 2);
    
            // Draw Chart Axes
            doc.setDrawColor("#cccccc");
            doc.line(chartX, chartStartY + chartHeight, chartX, chartStartY - 5); // Y-axis
            doc.line(chartX, chartStartY + chartHeight, chartX + chartWidth, chartStartY + chartHeight); // X-axis
            
            // Draw Bars and Labels
            doc.setFontSize(7);
            doc.setTextColor('#333333');
            chartData.forEach((item, index) => {
                const barHeight = maxQuantity > 0 ? (item.quantity / maxQuantity) * chartHeight : 0;
                const barX = chartX + (index * 2 + 0.5) * barWidth;
                
                doc.setFillColor(12, 127, 242);
                doc.rect(barX, chartStartY + chartHeight - barHeight, barWidth, barHeight, 'F');
                
                doc.text(item.name.slice(0,12), barX + barWidth / 2, chartStartY + chartHeight + 4, { align: 'right', angle: -45 });
            });
            
            // Y-axis labels and gridlines
            doc.setFontSize(8);
            doc.setDrawColor("#e0e0e0");
            for(let i=0; i <= 5; i++) {
                const value = Math.round((maxQuantity / 5) * i);
                const yPos = chartStartY + chartHeight - ((value / maxQuantity) * chartHeight);
                doc.text(value.toString(), chartX - 4, yPos + 3, { align: 'right' });
                doc.line(chartX + 1, yPos, chartX + chartWidth, yPos);
            }
        }
        
        // --- AI Health Report Section ---
        if (items.length > 0) {
            doc.addPage();
            header({} as any);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text("AI Inventory Health", margin, 40);
            
            finalY = 50;

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text("Overall Health Score:", margin, finalY);
            doc.setFont('helvetica', 'normal');
            doc.text(`${aiReport.overallHealthScore} / 100`, margin + 45, finalY);
            finalY += 10;
            
            aiReport.analysis.forEach(section => {
                if (finalY + 10 > pageHeight - 30) {
                    doc.addPage();
                    header({} as any);
                    finalY = 40;
                }
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text(section.title, margin, finalY);
                finalY += 6;
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                section.points.forEach(point => {
                    const splitText = doc.splitTextToSize(`• ${point}`, pageWidth - (margin * 2) - 4);
                    if (finalY + (splitText.length * 5) > pageHeight - 30) {
                        doc.addPage();
                        header({} as any);
                        finalY = 40;
                    }
                    doc.text(splitText, margin + 4, finalY);
                    finalY += (splitText.length * 5);
                });
                finalY += 4;
            });
            
            if (aiReport.lowStockItems && aiReport.lowStockItems.length > 0) {
                if (finalY > (pageHeight - 50)) {
                    doc.addPage();
                    header({} as any);
                    finalY = 40;
                }
                finalY += 5;
                autoTable(doc, {
                    head: [['Low Stock Item', 'Quantity', 'Price']],
                    body: aiReport.lowStockItems.map(i => [i.name, i.quantity, `$${i.price.toFixed(2)}`]),
                    startY: finalY,
                    theme: 'striped',
                    headStyles: { fillColor: [220, 53, 69] },
                    didDrawPage: (data) => pageSetup(data),
                    margin: { top: 35, left: margin, right: margin }
                });
                finalY = (doc as any).lastAutoTable.finalY + 5;
            }

             if (aiReport.inStockItems && aiReport.inStockItems.length > 0) {
                if (finalY > (pageHeight - 50)) {
                    doc.addPage();
                    header({} as any);
                    finalY = 40;
                }
                autoTable(doc, {
                    head: [['In-Stock Item', 'Quantity', 'Price']],
                    body: aiReport.inStockItems.map(i => [i.name, i.quantity, `$${i.price.toFixed(2)}`]),
                    startY: finalY,
                    theme: 'striped',
                    headStyles: { fillColor: [40, 167, 69] },
                    didDrawPage: pageSetup,
                    margin: { top: 35, left: margin, right: margin }
                });
                finalY = (doc as any).lastAutoTable.finalY;
            }
        }

        // --- Low Stock Report Section ---
        doc.addPage();
        header({} as any);
        autoTable(doc, {
            head: [['Item Name', 'SKU', 'Re-order Point', 'Supplier']],
            body: lowStockItems.map(item => [item.name, item.sku, item.reorderPoint, item.supplierName]),
            theme: 'striped',
            headStyles: { fillColor: [12, 127, 242] },
            didDrawPage: (data) => {
                header(data);
                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                doc.text("Low Stock Report", margin, 40);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                const lowStockText = `The following items have a quantity of 0 and require immediate attention.`;
                const splitLowStockText = doc.splitTextToSize(lowStockText, pageWidth - margin * 2);
                doc.text(splitLowStockText, margin, 50);
            },
            startY: 60,
            margin: { top: 35, left: margin, right: margin }
        });

        // --- Full Inventory Report Section ---
        doc.addPage();
        header({} as any);
        autoTable(doc, {
            head: [['Item Name', 'SKU', 'Category', 'Quantity', 'Unit Price']],
            body: items.map(item => [item.name, item.sku, categories.find(c => c.id === item.categoryId)?.name || 'N/A', item.quantity, `$${item.price.toFixed(2)}`]),
            theme: 'striped',
            headStyles: { fillColor: [12, 127, 242] },
            didDrawPage: (data) => {
                header(data);
                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                doc.text("Full Inventory Report", margin, 40);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                const fullInvText = `A complete list of all items currently in the inventory, including stock levels and pricing.`;
                const splitFullInvText = doc.splitTextToSize(fullInvText, pageWidth - margin * 2);
                doc.text(splitFullInvText, margin, 50);
            },
            startY: 60,
            margin: { top: 35, left: margin, right: margin }
        });

        // --- Sold Items Report Section ---
        doc.addPage();
        header({} as any);
        autoTable(doc, {
            head: [['Item Name', 'SKU', 'Qty Sold', 'Unit Price', 'Total Revenue', 'Date Sold']],
            body: soldItems.map(item => [
                item.name, 
                item.sku, 
                item.quantitySold, 
                `$${item.price.toFixed(2)}`,
                `$${(item.price * item.quantitySold).toFixed(2)}`,
                format(new Date(item.dateSold), 'PPP')
            ]),
            foot: [
                [{ content: 'Total Revenue', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, 
                 { content: `$${totalRevenue.toFixed(2)}`, styles: { fontStyle: 'bold' } }, 
                 '']
            ],
            theme: 'striped',
            headStyles: { fillColor: [12, 127, 242] },
            footStyles: { fillColor: [248, 250, 252], textColor: [0,0,0] },
            didDrawPage: (data) => {
                header(data);
                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                doc.text("Sold Items Report", margin, 40);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                const soldItemsText = `A log of all items sold.`;
                const splitSoldItemsText = doc.splitTextToSize(soldItemsText, pageWidth - margin * 2);
                doc.text(splitSoldItemsText, margin, 50);
            },
            startY: 60,
            margin: { top: 35, left: margin, right: margin }
        });

        addPageNumbers();
        doc.save(`consolidated-inventory-report-${new Date().toISOString().split('T')[0]}.pdf`);
        setIsGenerating(false);
    };

    const exportConsolidatedExcel = () => {
        const wb = XLSX.utils.book_new();

        // Low Stock Items Sheet
        const ws_low_stock = XLSX.utils.json_to_sheet(lowStockItems.map(item => ({
            Name: item.name,
            SKU: item.sku,
            Quantity: item.quantity,
            'Re-order Point': item.reorderPoint,
            'Supplier Name': item.supplierName
        })));
        XLSX.utils.book_append_sheet(wb, ws_low_stock, "Low Stock Items");

        // Full Inventory Sheet
        const ws_inventory = XLSX.utils.json_to_sheet(items.map(item => ({
            Name: item.name,
            SKU: item.sku,
            Category: categories.find(c => c.id === item.categoryId)?.name || 'N/A',
            Quantity: item.quantity,
            Price: item.price,
            'Re-order Point': item.reorderPoint,
            'Supplier Name': item.supplierName
        })));
        XLSX.utils.book_append_sheet(wb, ws_inventory, "Full Inventory");
        
        // In Stock Items Sheet
        const ws_in_stock = XLSX.utils.json_to_sheet(inStockItems.map(item => ({
            Name: item.name,
            SKU: item.sku,
            Category: categories.find(c => c.id === item.categoryId)?.name || 'N/A',
            Quantity: item.quantity,
            Price: item.price
        })));
        XLSX.utils.book_append_sheet(wb, ws_in_stock, "In-Stock Items");

        // Sold Items Sheet
        const soldData = soldItems.map(item => ({
            'Item Name': item.name,
            'SKU': item.sku,
            'Quantity Sold': item.quantitySold,
            'Price per Item': item.price,
            'Total Revenue': item.price * item.quantitySold,
            'Date Sold': format(new Date(item.dateSold), 'PPP')
        }));
        const ws_sold_items = XLSX.utils.json_to_sheet(soldData);
        XLSX.utils.sheet_add_aoa(ws_sold_items, [
            ["", "", "", "Total Revenue", totalRevenue]
        ], { origin: -1 });
        XLSX.utils.book_append_sheet(wb, ws_sold_items, "Sold Items");

        // Categories Sheet
        const ws_categories = XLSX.utils.json_to_sheet(categories.map(category => ({
            Name: category.name,
            Description: category.description || 'N/A',
            'Item Count': category.itemCount
        })));
        XLSX.utils.book_append_sheet(wb, ws_categories, "Categories");

        XLSX.writeFile(wb, `consolidated-inventory-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    if (isLoading) {
        return (
            <>
                <PageHeader
                    title="Reports"
                    description="Generate and view inventory reports."
                />
                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Low Stock Report</CardTitle>
                            <CardDescription>Items that are at or below their re-order point.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Skeleton className="h-20 w-full" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Full Inventory Report</CardTitle>
                            <CardDescription>A complete list of all items in your inventory.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Skeleton className="h-20 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </>
        )
    }

    return (
        <>
            <PageHeader
                title="Reports"
                description="Generate and view inventory reports."
            >
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" disabled={isGenerating || !aiReport}>
                            {isGenerating ? "Generating..." : "Export Whole Report as..."}
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={exportConsolidatedPDF} disabled={isGenerating || !aiReport}>
                            <FileDown className="mr-2 h-4 w-4" />
                            Export as PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportConsolidatedExcel} disabled={isGenerating || !aiReport}>
                            <FileDown className="mr-2 h-4 w-4" />
                            Export as Excel
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </PageHeader>
            <div className="grid gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Low Stock Report</CardTitle>
                            <CardDescription>Items that have a quantity of 0.</CardDescription>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    Export as...
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={exportLowStockPDF}>
                                    <FileDown className="mr-2 h-4 w-4" />
                                    Export as PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={exportLowStockExcel}>
                                    <FileDown className="mr-2 h-4 w-4" />
                                    Export as Excel
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead className="text-right">Re-order Point</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lowStockItems.length > 0 ? lowStockItems.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>{item.sku}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">{item.reorderPoint}</TableCell>
                                    </TableRow>
                                )) : (
                                     <TableRow>
                                        <TableCell colSpan={4} className="text-center">
                                            No items are currently low on stock.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Sold Items Report</CardTitle>
                            <CardDescription>A log of all items that have been sold.</CardDescription>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    Export as...
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={exportSoldItemsPDF}>
                                    <FileDown className="mr-2 h-4 w-4" />
                                    Export as PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={exportSoldItemsExcel}>
                                    <FileDown className="mr-2 h-4 w-4" />
                                    Export as Excel
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead className="text-right">Qty Sold</TableHead>
                                    <TableHead className="text-right">Total Revenue</TableHead>
                                    <TableHead>Date Sold</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {soldItems.length > 0 ? soldItems.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>{item.sku}</TableCell>
                                        <TableCell className="text-right">{item.quantitySold}</TableCell>
                                        <TableCell className="text-right font-medium">${(item.price * item.quantitySold).toFixed(2)}</TableCell>
                                        <TableCell>{format(new Date(item.dateSold), 'PPP')}</TableCell>
                                    </TableRow>
                                )) : (
                                     <TableRow>
                                        <TableCell colSpan={5} className="text-center">
                                            No items have been sold yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                             <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={3} className="text-right font-bold">Total Revenue</TableCell>
                                    <TableCell className="text-right font-bold text-primary">
                                        {`$${totalRevenue.toFixed(2)}`}
                                    </TableCell>
                                    <TableCell />
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Full Inventory Report</CardTitle>
                            <CardDescription>A complete list of all items in your inventory.</CardDescription>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    Export as...
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={exportFullInventoryPDF}>
                                    <FileDown className="mr-2 h-4 w-4" />
                                    Export as PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={exportFullInventoryExcel}>
                                    <FileDown className="mr-2 h-4 w-4" />
                                    Export as Excel
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </CardHeader>
                    <CardContent>
                    <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.length > 0 ? items.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>{categories.find(c => c.id === item.categoryId)?.name || 'N/A'}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                                    </TableRow>
                                )) : (
                                     <TableRow>
                                        <TableCell colSpan={4} className="text-center">
                                            No items in inventory.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
