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
  sale_id?: string | null; sale_item_id?: string | null;
};
export type Customer = { id: string; name: string; email: string | null; phone: string | null; address: string | null; notes: string | null };
export type Sale = {
  id: string; receipt_number: string; customer_id: string | null; subtotal: number; discount_amount: number;
  tax_amount: number; total_amount: number; amount_paid: number; payment_method: string;
  payment_status: string; notes: string | null; sold_by: string; created_at: string;
  customers?: { name: string } | null;
};
export type SaleItem = {
  id: string; sale_id: string; product_id: string; product_name: string; sku: string;
  quantity: number; returned_quantity: number; unit_cost: number; unit_price: number;
  discount_amount: number; line_total: number;
};
