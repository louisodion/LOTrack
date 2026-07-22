"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGuard from "@/app/components/AuthGuard";
import AppNav from "@/app/components/AppNav";
import { supabase } from "@/lib/supabaseClient";

type ProductIdNameRecord = {
  id: string;
  name: string;
};

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<Array<{id:string; product_name:string; type:string; quantity:number; note:string | null; created_at:string;}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMovements = async () => {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;

      if (!userId) {
        setMovements([]);
        setLoading(false);
        return;
      }

      const { data: movementData, error: movementError } = await supabase
        .from("stock_movements")
        .select("id,product_id,type,quantity,note,created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (movementError) {
        setError(movementError.message);
        setLoading(false);
        return;
      }

      const movementsArray = Array.isArray(movementData) ? movementData : [];
      const productIds = Array.from(new Set(movementsArray.map((movement) => movement.product_id)));
      const { data: productsData, error: productsError } = productIds.length
        ? await supabase.from("products").select("id,name").in("id", productIds)
        : { data: [], error: null };

      if (productsError) {
        setError(productsError.message);
        setLoading(false);
        return;
      }

      const productMap = new Map((productsData ?? []).map((product: ProductIdNameRecord) => [product.id, product.name]));
      setMovements(
        movementsArray.map((movement) => ({
          id: movement.id,
          product_name: productMap.get(movement.product_id) ?? movement.product_id,
          type: movement.type,
          quantity: Number(movement.quantity),
          note: movement.note ?? null,
          created_at: movement.created_at,
        })),
      );

      setLoading(false);
    };

    loadMovements();
  }, []);

  return (
    <AuthGuard>
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100 sm:px-12 lg:px-16">
        <div className="mx-auto max-w-6xl space-y-8">
          <AppNav />
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Stock movements</p>
                <h1 className="text-3xl font-semibold text-white">Inventory activity history.</h1>
                <p className="mt-2 text-sm text-slate-400">Review the latest stock in, stock out, sales, returns, and adjustments.</p>
              </div>
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                View products
              </Link>
            </div>

            <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80">
              {loading ? (
                <p className="p-8 text-sm text-slate-400">Loading activity…</p>
              ) : error ? (
                <p className="p-8 text-sm text-rose-400">{error}</p>
              ) : movements.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  No stock movements yet. Add inventory records to see activity here.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-800 text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-400">
                    <tr>
                      <th className="px-6 py-4 uppercase tracking-[0.18em]">Product</th>
                      <th className="px-6 py-4 uppercase tracking-[0.18em]">Type</th>
                      <th className="px-6 py-4 uppercase tracking-[0.18em]">Quantity</th>
                      <th className="px-6 py-4 uppercase tracking-[0.18em]">Note</th>
                      <th className="px-6 py-4 uppercase tracking-[0.18em]">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950/80">
                    {movements.map((movement) => (
                      <tr key={movement.id} className="transition hover:bg-slate-900/70">
                        <td className="px-6 py-4 font-medium text-white">{movement.product_name}</td>
                        <td className="px-6 py-4 capitalize">{movement.type.replace("_", " ")}</td>
                        <td className="px-6 py-4">{movement.quantity}</td>
                        <td className="px-6 py-4">{movement.note ?? "—"}</td>
                        <td className="px-6 py-4">{new Date(movement.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
