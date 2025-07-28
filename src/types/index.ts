
export type Item = {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  quantity: number;
  price: number;
  supplierName: string;
  reorderPoint: number;
  averageDailySales: number;
  leadTimeDays: number;
};

export type Category = {
  id: string;
  name: string;
  description?: string;
  itemCount: number;
};

export type SoldItem = {
  id: string; // Unique ID for the sale transaction
  itemId: string;
  name: string;
  sku: string;
  quantitySold: number;
  price: number; // Price at the time of sale
  dateSold: string; // ISO string date
};
