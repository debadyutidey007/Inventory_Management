
"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { MoreHorizontal, PlusCircle, Edit, Trash2, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import type { Item, Category } from "@/types";
import { ItemForm } from "./item-form";
import { useToast } from "@/hooks/use-toast";
import { Label } from "../ui/label";

type ItemsTableProps = {
  items: Item[];
  categories: Category[];
  view: 'all' | 'low-stock';
  onAddItem: (newItem: Omit<Item, 'id' | 'averageDailySales' | 'leadTimeDays'>) => void;
  onEditItem: (updatedItem: Item) => void;
  onDeleteItem: (itemId: string) => void;
  onSellItem: (item: Item, quantity: number) => void;
};

export function ItemsTable({ items, categories, view, onAddItem, onEditItem, onDeleteItem, onSellItem }: ItemsTableProps) {
  const { toast } = useToast();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isSellDialogOpen, setIsSellDialogOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<Item | null>(null);
  const [sellQuantity, setSellQuantity] = React.useState<number | string>(1);

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || "N/A";
  };
  
  const handleDelete = () => {
    if (selectedItem) {
      onDeleteItem(selectedItem.id);
      toast({
        title: "Item Deleted",
        description: `Item "${selectedItem.name}" has been deleted.`,
      });
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
    }
  };

  const handleSellConfirm = () => {
    const quantityNum = Number(sellQuantity);
    if (selectedItem && quantityNum > 0 && quantityNum <= selectedItem.quantity) {
      onSellItem(selectedItem, quantityNum);
      toast({
        title: "Item Sold",
        description: `Sold ${quantityNum} of "${selectedItem.name}".`,
      });
      setIsSellDialogOpen(false);
      setSelectedItem(null);
      setSellQuantity(1);
    } else {
        toast({
            title: "Invalid Quantity",
            description: `Please enter a valid quantity to sell.`,
            variant: "destructive",
          });
    }
  };

  const columns: ColumnDef<Item>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "sku",
      header: "SKU",
    },
    {
      accessorKey: "categoryId",
      header: "Category",
      cell: ({ row }) => getCategoryName(row.getValue("categoryId")),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "quantity",
      header: "Quantity",
      cell: ({ row }) => {
        const quantity = parseFloat(row.getValue("quantity"));
        let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "secondary";
        if (quantity === 0) {
            badgeVariant = "destructive";
        } else if (quantity <= row.original.reorderPoint) {
            badgeVariant = "outline";
        }
        return <Badge variant={badgeVariant}>{quantity}</Badge>;
      },
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("price"));
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(amount);
        return <div className="text-left font-medium">{formatted}</div>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const item = row.original;
  
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => {
                  navigator.clipboard.writeText(item.id);
                  toast({
                    title: "Copied!",
                    description: "Item ID copied to clipboard.",
                  });
                }}>
                  Copy item ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {view === 'all' && item.quantity > 0 && (
                    <DropdownMenuItem
                        onClick={() => {
                            setSelectedItem(item);
                            setSellQuantity(1);
                            setIsSellDialogOpen(true);
                        }}
                    >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Sell Item
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => {
                    setSelectedItem(item);
                    setIsEditDialogOpen(true);
                }}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  onClick={() => {
                    setSelectedItem(item);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: items,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter items by name..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Dialog open={isNewItemDialogOpen} onOpenChange={setIsNewItemDialogOpen}>
            <DialogTrigger asChild>
                <Button className="ml-auto">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Item</DialogTitle>
                    <DialogDescription>
                        Fill in the details below to add a new item to your inventory.
                    </DialogDescription>
                </DialogHeader>
                <ItemForm 
                    categories={categories} 
                    onSuccess={() => setIsNewItemDialogOpen(false)} 
                    onAddItem={onAddItem}
                />
            </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>

      {/* Edit Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
                Update the details for the "{selectedItem?.name}" item.
            </DialogDescription>
          </DialogHeader>
          <ItemForm
            item={selectedItem!}
            categories={categories}
            onSuccess={() => {
              setIsEditDialogOpen(false);
              setSelectedItem(null);
            }}
            onEditItem={onEditItem}
          />
        </DialogContent>
      </Dialog>
      
      {/* Delete Item Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the item
              "{selectedItem?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedItem(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sell Item Dialog */}
      <Dialog open={isSellDialogOpen} onOpenChange={setIsSellDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Sell Item: {selectedItem?.name}</DialogTitle>
                <DialogDescription>
                    Enter the quantity to sell. Max: {selectedItem?.quantity}
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="sell-quantity" className="text-right">
                        Quantity
                    </Label>
                    <Input
                        id="sell-quantity"
                        type="number"
                        min="1"
                        max={selectedItem?.quantity}
                        value={sellQuantity}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (value === "") {
                                setSellQuantity("");
                            } else {
                                const numValue = parseInt(value, 10);
                                if (!isNaN(numValue)) {
                                    setSellQuantity(numValue);
                                }
                            }
                        }}
                        className="col-span-3"
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsSellDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSellConfirm}>Confirm Sale</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
