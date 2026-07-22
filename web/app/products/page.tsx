"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGuard from "@/app/components/AuthGuard";
import AppNav from "@/app/components/AppNav";
import { supabase } from "@/lib/supabaseClient";

interface Product {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  reorder_threshold: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;

      if (!userId) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select("id,name,sku,quantity,price,reorder_threshold")
        .order("name", { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setProducts((data ?? []) as Product[]);
      }

      setLoading(false);
    };

    loadProducts();
  }, []);

  return (
    <AuthGuard>
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100 sm:px-12 lg:px-16">
        <div className="mx-auto max-w-6xl space-y-8">
          <AppNav />
          <div className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/30 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Product catalog</p>
              <h1 className="mt-3 text-3xl font-semibold text-white">Manage your inventory.</h1>
              <p className="mt-2 text-sm text-slate-400">Add products, track stock, and keep your business stock levels up to date.</p>
            </div>
            <Link
              href="/products/new"
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Add product
            </Link>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
            {loading ? (
              <p className="text-sm text-slate-400">Loading products…</p>
            ) : error ? (
              <p className="text-sm text-rose-400">{error}</p>
            ) : products.length === 0 ? (
              <div className="space-y-4 text-center">
                <p className="text-lg font-semibold text-white">No products yet.</p>
                <p className="text-sm text-slate-400">Create a product to start tracking inventory in your workspace.</p>
                <Link
                  href="/products/new"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                >
                  Add your first product
                </Link>
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80">
                <table className="min-w-full divide-y divide-slate-800 text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-400">
                    <tr>
                      <th className="px-6 py-4 uppercase tracking-[0.18em]">Product</th>
                      <th className="px-6 py-4 uppercase tracking-[0.18em]">SKU</th>
                      <th className="px-6 py-4 uppercase tracking-[0.18em]">Quantity</th>
                      <th className="px-6 py-4 uppercase tracking-[0.18em]">Price</th>
                      <th className="px-6 py-4 uppercase tracking-[0.18em]">Reorder</th>
                      <th className="px-6 py-4 uppercase tracking-[0.18em]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950/80">
                    {products.map((product) => (
                      <tr key={product.id} className="transition hover:bg-slate-900/70">
                        <td className="px-6 py-4 font-medium text-white">{product.name}</td>
                        <td className="px-6 py-4">{product.sku}</td>
                        <td className="px-6 py-4">{product.quantity}</td>
                        <td className="px-6 py-4">₦{product.price.toLocaleString()}</td>
                        <td className="px-6 py-4">{product.reorder_threshold}</td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/products/${product.id}`}
                            className="rounded-full bg-slate-800 px-3 py-1 text-sm font-semibold text-emerald-300 transition hover:bg-slate-700"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
