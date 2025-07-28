
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Item, Category } from "@/types";

const itemFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  sku: z.string().min(2, "SKU must be at least 2 characters."),
  categoryId: z.string({ required_error: "Please select a category." }),
  quantity: z.coerce.number().int().nonnegative("Quantity must be a positive number."),
  price: z.coerce.number().positive("Price must be a positive number."),
  reorderPoint: z.coerce.number().int().nonnegative("Reorder point must be a positive number."),
  supplierName: z.string().min(2, "Supplier name must be at least 2 characters."),
});

type ItemFormProps = {
  item?: Item;
  categories: Category[];
  onSuccess: () => void;
  onAddItem?: (newItem: Omit<Item, 'id' | 'averageDailySales' | 'leadTimeDays'>) => void;
  onEditItem?: (updatedItem: Item) => void;
};

export function ItemForm({ item, categories, onSuccess, onAddItem, onEditItem }: ItemFormProps) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof itemFormSchema>>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: item || {
      name: "",
      sku: "",
      categoryId: "",
      quantity: 0,
      price: 0,
      reorderPoint: 0,
      supplierName: "",
    },
  });

  useEffect(() => {
    if (item) {
      form.reset(item);
    } else {
        form.reset({
            name: "",
            sku: "",
            categoryId: "",
            quantity: 0,
            price: 0,
            reorderPoint: 0,
            supplierName: "",
        });
    }
  }, [item, form]);

  function onSubmit(values: z.infer<typeof itemFormSchema>) {
    if (item && onEditItem) {
        onEditItem({ ...item, ...values });
    } else if (onAddItem) {
        onAddItem(values);
    }
    
    toast({
      title: `Item ${item ? "updated" : "created"}`,
      description: `The item "${values.name}" has been saved successfully.`,
    });
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Wireless Keyboard" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SKU</FormLabel>
              <FormControl>
                <Input placeholder="e.g. WK-0012" {...field} />
              </FormControl>
              <FormDescription>Stock Keeping Unit</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                        {category.name}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                    <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                    <Input type="number" step="0.01" placeholder="$0.00" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
          control={form.control}
          name="reorderPoint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Re-order Point</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormDescription>
                When stock reaches this level, a re-order is suggested.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="supplierName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Supplier Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Office Supplies Co." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          {item ? "Update" : "Create"} Item
        </Button>
      </form>
    </Form>
  );
}
