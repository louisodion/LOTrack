export type UserRole = "owner" | "admin" | "staff";
export type Category = { id: string; name: string; description: string | null; workspace_id: string };
export type Product = {
  id: string; name: string; sku: string; category_id: string | null; description: string | null;
  quantity: number; cost_price: number; selling_price: number; reorder_threshold: number;
  overstock_threshold: number | null; supplier: string | null; image_url: string | null;
  unit: string; expiry_date: string | null; barcode: string | null;
  categories?: { name: string } | null;
};
export type Movement = {
  id: string; product_id: string; type: string; quantity: number;
  unit_cost: number | null; unit_price: number | null; created_at: string;
};
