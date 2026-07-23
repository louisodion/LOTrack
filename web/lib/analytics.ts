import type { Category, Movement, Product } from "@/lib/types";

export type DatePreset = "today" | "7d" | "30d" | "month" | "lastMonth" | "quarter" | "year" | "custom";

export function dateRange(preset: DatePreset, customStart = "", customEnd = "") {
  const end = customEnd ? new Date(`${customEnd}T23:59:59`) : new Date();
  const start = new Date(end);
  if (preset === "custom" && customStart) return { start: new Date(`${customStart}T00:00:00`), end };
  if (preset === "today") start.setHours(0, 0, 0, 0);
  if (preset === "7d") start.setDate(start.getDate() - 6);
  if (preset === "30d") start.setDate(start.getDate() - 29);
  if (preset === "month") start.setDate(1);
  if (preset === "lastMonth") {
    start.setMonth(start.getMonth() - 1, 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
  }
  if (preset === "quarter") start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
  if (preset === "year") start.setMonth(0, 1);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

export function calculateAnalytics(products: Product[], categories: Category[], movements: Movement[], start: Date, end: Date) {
  const ranged = movements.filter((m) => {
    const time = new Date(m.created_at);
    return time >= start && time <= end;
  });
  const sales = ranged.filter((m) => m.type === "sale" || (m.type === "return" && m.sale_id));
  const byProduct = new Map<string, { quantitySold: number; revenue: number; cost: number }>();
  for (const sale of sales) {
    const direction = sale.type === "return" ? -1 : 1;
    const value = byProduct.get(sale.product_id) ?? { quantitySold: 0, revenue: 0, cost: 0 };
    value.quantitySold += direction * Number(sale.quantity);
    value.revenue += direction * Number(sale.quantity) * Number(sale.unit_price ?? 0);
    value.cost += direction * Number(sale.quantity) * Number(sale.unit_cost ?? 0);
    byProduct.set(sale.product_id, value);
  }
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  const rows = products.map((product) => {
    const sale = byProduct.get(product.id) ?? { quantitySold: 0, revenue: 0, cost: 0 };
    const profit = sale.revenue - sale.cost;
    const margin = sale.revenue ? (profit / sale.revenue) * 100 : 0;
    const dailySales = sale.quantitySold / days;
    const daysRemaining = dailySales ? product.quantity / dailySales : null;
    let status = "Average";
    if (!sale.quantitySold) status = "No Sales";
    if (product.quantity === 0) status = "Out of Stock";
    else if (product.quantity <= product.reorder_threshold) status = "Low Stock";
    else if (product.overstock_threshold && product.quantity >= product.overstock_threshold) status = "Overstocked";
    else if (sale.quantitySold >= 10) status = "Top Performing";
    else if (sale.quantitySold >= 3) status = "Performing Well";
    else if (sale.quantitySold > 0) status = "Slow Moving";
    const action = status === "Out of Stock" || status === "Low Stock" ? "Restock now"
      : status === "Overstocked" || status === "No Sales" ? "Review demand" : "Keep monitoring";
    return { product, ...sale, profit, margin, daysRemaining, status, action };
  });
  const inventoryValue = products.reduce((s, p) => s + p.quantity * p.cost_price, 0);
  const potentialRevenue = products.reduce((s, p) => s + p.quantity * p.selling_price, 0);
  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  const profit = rows.reduce((s, r) => s + r.profit, 0);
  const now = Date.now();
  const categoryRows = categories.map((category) => {
    const items = rows.filter((r) => r.product.category_id === category.id);
    const best = [...items].sort((a, b) => b.revenue - a.revenue)[0];
    return {
      category, products: items.length, quantitySold: items.reduce((s, r) => s + r.quantitySold, 0),
      revenue: items.reduce((s, r) => s + r.revenue, 0), profit: items.reduce((s, r) => s + r.profit, 0),
      stockValue: items.reduce((s, r) => s + r.product.quantity * r.product.cost_price, 0),
      best: best?.product.name ?? "No sales", status: best?.revenue ? "Performing" : "No sales",
    };
  });
  return {
    rows, categoryRows, inventoryValue, potentialRevenue, potentialProfit: potentialRevenue - inventoryValue,
    revenue, profit, averageMargin: revenue ? (profit / revenue) * 100 : 0,
    totalStock: products.reduce((s, p) => s + p.quantity, 0),
    lowStock: products.filter((p) => p.quantity > 0 && p.quantity <= p.reorder_threshold).length,
    outOfStock: products.filter((p) => p.quantity === 0).length,
    overstocked: products.filter((p) => p.overstock_threshold && p.quantity >= p.overstock_threshold).length,
    closeToExpiry: products.filter((p) => p.expiry_date && new Date(p.expiry_date).getTime() >= now && new Date(p.expiry_date).getTime() - now <= 30 * 86400000).length,
  };
}

export function insightsFor(analytics: ReturnType<typeof calculateAnalytics>) {
  const insights: string[] = [];
  const low = analytics.rows.filter((r) => r.status === "Low Stock" || r.status === "Out of Stock");
  if (low.length) insights.push(`${low.length} product${low.length === 1 ? " is" : "s are"} at or below the reorder threshold.`);
  const noSales = analytics.rows.filter((r) => r.status === "No Sales");
  if (noSales.length) insights.push(`${noSales[0].product.name} recorded no sales in the selected period.`);
  const top = [...analytics.rows].sort((a, b) => b.revenue - a.revenue)[0];
  if (top?.revenue) insights.push(`${top.product.name} generated the highest product revenue in this period.`);
  const lowMargin = analytics.rows.find((r) => r.revenue > 0 && r.margin < 15);
  if (lowMargin) insights.push(`${lowMargin.product.name} has a ${lowMargin.margin.toFixed(1)}% margin. Review its pricing or cost.`);
  const expiry = analytics.rows.find((r) => r.product.expiry_date && new Date(r.product.expiry_date).getTime() - Date.now() <= 30 * 86400000);
  if (expiry) insights.push(`${expiry.product.name} is close to its expiry date.`);
  return insights;
}

export function toCsv(rows: ReturnType<typeof calculateAnalytics>["rows"]) {
  const headings = ["Product","SKU","Category","Quantity sold","Revenue","Profit","Profit margin","Current stock","Reorder threshold","Days remaining","Status","Recommended action"];
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  return [headings, ...rows.map((r) => [
    r.product.name, r.product.sku, r.product.categories?.name ?? "Uncategorized", r.quantitySold,
    r.revenue.toFixed(2), r.profit.toFixed(2), r.margin.toFixed(2), r.product.quantity,
    r.product.reorder_threshold, r.daysRemaining?.toFixed(1) ?? "No sales", r.status, r.action,
  ])].map((line) => line.map(escape).join(",")).join("\n");
}
