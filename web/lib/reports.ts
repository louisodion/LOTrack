import type { Product, Purchase, Sale, SaleItem } from "@/lib/types";

export type ReportSaleItem = SaleItem & { sale_returns?: { quantity: number; refund_amount: number }[] };

export type ProductReportRow = {
  id: string; name: string; sku: string; sold: number; returned: number;
  netRevenue: number; cost: number; profit: number; stock: number; stockValue: number;
};

export function reportRange(preset: string, customStart: string, customEnd: string) {
  const end = preset === "custom" && customEnd ? new Date(`${customEnd}T23:59:59.999`) : new Date();
  const start = new Date(end);
  if (preset === "today") start.setHours(0, 0, 0, 0);
  else if (preset === "7d") start.setDate(start.getDate() - 6);
  else if (preset === "month") { start.setDate(1); start.setHours(0, 0, 0, 0); }
  else if (preset === "year") { start.setMonth(0, 1); start.setHours(0, 0, 0, 0); }
  else if (preset === "custom" && customStart) start.setTime(new Date(`${customStart}T00:00:00`).getTime());
  else start.setDate(start.getDate() - 29);
  if (!["today", "month", "year", "custom"].includes(preset)) start.setHours(0, 0, 0, 0);
  return { start, end };
}

export function productReport(products: Product[], sales: Sale[], saleItems: ReportSaleItem[], start: Date, end: Date): ProductReportRow[] {
  const saleIds = new Set(sales.filter(sale => {
    const date = new Date(sale.created_at);
    return date >= start && date <= end;
  }).map(sale => sale.id));
  const rows = new Map(products.map(product => [product.id, {
    id: product.id, name: product.name, sku: product.sku, sold: 0, returned: 0,
    netRevenue: 0, cost: 0, profit: 0, stock: Number(product.quantity),
    stockValue: Number(product.quantity) * Number(product.cost_price),
  }]));
  for (const item of saleItems.filter(item => saleIds.has(item.sale_id))) {
    const row = rows.get(item.product_id);
    if (!row) continue;
    const returned = Number(item.returned_quantity ?? 0);
    const netQuantity = Number(item.quantity) - returned;
    const refund = (item.sale_returns ?? []).reduce((sum, value) => sum + Number(value.refund_amount), 0);
    const revenue = Number(item.line_total) - refund;
    const cost = netQuantity * Number(item.unit_cost);
    row.sold += Number(item.quantity);
    row.returned += returned;
    row.netRevenue += revenue;
    row.cost += cost;
    row.profit += revenue - cost;
  }
  return [...rows.values()];
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function totalsForPurchases(purchases: Purchase[], start: Date, end: Date) {
  const ranged = purchases.filter(purchase => {
    const date = new Date(purchase.received_at ?? purchase.created_at);
    return purchase.status === "received" && date >= start && date <= end;
  });
  return {
    count: ranged.length,
    total: ranged.reduce((sum, purchase) => sum + Number(purchase.total_amount), 0),
    paid: ranged.reduce((sum, purchase) => sum + Number(purchase.amount_paid), 0),
  };
}
