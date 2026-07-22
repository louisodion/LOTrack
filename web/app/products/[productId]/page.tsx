"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthGuard from "@/app/components/AuthGuard";
import AppNav from "@/app/components/AppNav";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabaseClient";
import { productSchema } from "@/lib/schemas";
import type { z } from "zod";

type ProductFormValues = z.infer<typeof productSchema>;

export default function ProductEditPage() {
  const router = useRouter();
  const params = useParams();
  const productId = Array.isArray(params?.productId) ? params.productId[0] : params?.productId;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      quantity: 0,
      price: 0,
      reorder_threshold: 1,
    },
  });

  useEffect(() => {
    const loadProduct = async () => {
      if (!productId) {
        setSubmitError("Product not found.");
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;

      if (!userId) {
        setSubmitError("Unable to determine user session. Please sign in again.");
        setLoading(false);
        return;
      }

      const { data: product, error: productError } = await supabase
        .from("products")
        .select("name,sku,quantity,price,reorder_threshold")
        .eq("id", productId)
        .single();

      if (productError || !product) {
        setSubmitError(productError?.message ?? "Product not found.");
      } else {
        reset({
          name: product.name,
          sku: product.sku,
          quantity: product.quantity,
          price: product.price,
          reorder_threshold: product.reorder_threshold,
        });
      }

      setLoading(false);
    };

    loadProduct();
  }, [productId, reset]);

  const onSubmit = async (values: ProductFormValues) => {
    if (!productId) return;
    setSaving(true);
    setSubmitError(null);

    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;

    if (!userId) {
      setSubmitError("Unable to determine user session. Please sign in again.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("products")
      .update({
        name: values.name,
        sku: values.sku,
        quantity: values.quantity,
        price: values.price,
        reorder_threshold: values.reorder_threshold,
      })
      .eq("id", productId);

    setSaving(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    router.push("/products");
  };

  const handleDelete = async () => {
    if (!productId) return;

    const confirmed = window.confirm(
      "Delete this product? This action cannot be undone."
    );
    if (!confirmed) return;

    setDeleteLoading(true);
    setSubmitError(null);

    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;

    if (!userId) {
      setSubmitError("Unable to determine user session. Please sign in again.");
      setDeleteLoading(false);
      return;
    }

    const { error } = await supabase.from("products").delete().eq("id", productId);

    setDeleteLoading(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    router.push("/products");
  };

  return (
    <AuthGuard>
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100 sm:px-12 lg:px-16">
        <div className="mx-auto max-w-3xl space-y-8">
          <AppNav />
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Edit product</p>
                <h1 className="text-3xl font-semibold text-white">Update product details.</h1>
              </div>
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-full bg-slate-800 px-5 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-slate-700"
              >
                Back to products
              </Link>
            </div>

            {loading ? (
              <p className="mt-8 text-slate-400">Loading product details…</p>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
                <label className="space-y-2 text-sm text-slate-300">
                  <span>Product name</span>
                  <input
                    type="text"
                    {...register("name")}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {formState.errors.name ? <p className="text-xs text-rose-400">{formState.errors.name.message}</p> : null}
                </label>
                <label className="space-y-2 text-sm text-slate-300">
                  <span>SKU</span>
                  <input
                    type="text"
                    {...register("sku")}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  {formState.errors.sku ? <p className="text-xs text-rose-400">{formState.errors.sku.message}</p> : null}
                </label>
                <div className="grid gap-6 sm:grid-cols-3">
                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Quantity</span>
                    <input
                      type="number"
                      min={0}
                      {...register("quantity", { valueAsNumber: true })}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                    />
                    {formState.errors.quantity ? <p className="text-xs text-rose-400">{formState.errors.quantity.message}</p> : null}
                  </label>
                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Price</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      {...register("price", { valueAsNumber: true })}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                    />
                    {formState.errors.price ? <p className="text-xs text-rose-400">{formState.errors.price.message}</p> : null}
                  </label>
                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Reorder threshold</span>
                    <input
                      type="number"
                      min={1}
                      {...register("reorder_threshold", { valueAsNumber: true })}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                    />
                    {formState.errors.reorder_threshold ? (
                      <p className="text-xs text-rose-400">{formState.errors.reorder_threshold.message}</p>
                    ) : null}
                  </label>
                </div>
                {submitError ? <p className="text-sm text-rose-400">{submitError}</p> : null}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                  >
                    {saving ? "Saving product..." : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="inline-flex items-center justify-center rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:opacity-60"
                  >
                    {deleteLoading ? "Deleting..." : "Delete product"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
