"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/app/components/AuthGuard";
import AppNav from "@/app/components/AppNav";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabaseClient";
import { stockMovementSchema } from "@/lib/schemas";
import type { z } from "zod";

type StockMovementValues = z.infer<typeof stockMovementSchema>;

export default function NewStockMovementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);

  const { register, handleSubmit, formState } = useForm<StockMovementValues>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: {
      productId: "",
      type: "stock_in",
      quantity: 1,
      note: "",
    },
  });

  useEffect(() => {
    const loadProducts = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;

      if (!userId) {
        setProducts([]);
        return;
      }

      const { data } = await supabase
        .from("products")
        .select("id,name,quantity")
        .order("name", { ascending: true });
      setProducts((data ?? []) as Array<{ id: string; name: string }>);
    };

    loadProducts();
  }, []);

  const onSubmit = async (values: StockMovementValues) => {
    setLoading(true);
    setSubmitError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      setSubmitError("Unable to determine user session. Please sign in again.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.rpc("record_stock_movement", {
      p_product_id: values.productId,
      p_type: values.type,
      p_quantity: values.quantity,
      p_note: values.note || null,
    });

    setLoading(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    router.push("/stock-movements");
  };

  return (
    <AuthGuard>
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100 sm:px-12 lg:px-16">
        <div className="mx-auto max-w-3xl space-y-8">
          <AppNav />
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Stock movement</p>
              <h1 className="text-3xl font-semibold text-white">Log inventory activity.</h1>
              <p className="text-sm leading-6 text-slate-400">Stock in, returns, and adjustments add inventory. Stock out and sales subtract inventory.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
              <label className="space-y-2 text-sm text-slate-300">
                <span>Product</span>
                <select
                  {...register("productId")}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                {formState.errors.productId ? <p className="text-xs text-rose-400">{formState.errors.productId.message}</p> : null}
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Type</span>
                <select
                  {...register("type")}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="stock_in">Stock in</option>
                  <option value="stock_out">Stock out</option>
                  <option value="sale">Sale</option>
                  <option value="return">Return</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Quantity</span>
                <input
                  type="number"
                  min={1}
                  {...register("quantity", { valueAsNumber: true })}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                />
                {formState.errors.quantity ? <p className="text-xs text-rose-400">{formState.errors.quantity.message}</p> : null}
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Note (optional)</span>
                <textarea
                  rows={3}
                  {...register("note")}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                />
              </label>
              {submitError ? <p className="text-sm text-rose-400">{submitError}</p> : null}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                >
                  {loading ? "Logging activity..." : "Save movement"}
                </button>
                <Link href="/stock-movements" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
                  Back to activity
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
