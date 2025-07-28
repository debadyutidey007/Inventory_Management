
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Category } from "@/types";
import { useEffect } from "react";

const categoryFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  description: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

type CategoryFormProps = {
  category?: Category;
  onSuccess: () => void;
  onAddCategory?: (newCategory: Omit<Category, 'id' | 'itemCount'>) => void;
  onEditCategory?: (updatedCategory: Category) => void;
};

export function CategoryForm({ category, onSuccess, onAddCategory, onEditCategory }: CategoryFormProps) {
  const { toast } = useToast();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: category || {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (category) {
      form.reset(category);
    } else {
      form.reset({ name: "", description: "" });
    }
  }, [category, form]);

  function onSubmit(values: CategoryFormValues) {
    if (category && onEditCategory) {
      onEditCategory({ ...category, ...values });
    } else if (onAddCategory) {
      onAddCategory(values);
    }
    
    toast({
      title: `Category ${category ? "updated" : "created"}`,
      description: `The category "${values.name}" has been saved successfully.`,
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
              <FormLabel>Category Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Electronics" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="A short description of the category."
                  className="resize-none"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          {category ? "Update" : "Create"} Category
        </Button>
      </form>
    </Form>
  );
}
