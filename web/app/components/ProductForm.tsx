"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { productSchema } from "@/lib/schemas";
import { supabase } from "@/lib/supabaseClient";
import { getWorkspaceScope } from "@/lib/workspace";
import type { Category } from "@/lib/types";

export type ProductValues = z.infer<typeof productSchema>;

export default function ProductForm({ initial, onSave, submitLabel }: {
  initial?: Partial<ProductValues>;
  onSave: (values: ProductValues) => Promise<{ error: string | null }>;
  submitLabel: string;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState, setValue } = useForm<ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "", sku: "", category_id: null, description: "", quantity: 0,
      cost_price: 0, selling_price: 0, reorder_threshold: 1, supplier: "",
      image_url: "", unit: "unit", expiry_date: "", barcode: "", overstock_threshold: null, ...initial,
    },
  });

  useEffect(() => {
    void supabase.from("categories").select("id,name,description,workspace_id").order("name").then(({ data }) => {
      setCategories((data ?? []) as Category[]);
    });
  }, []);

  const createCategory = async () => {
    if (newCategory.trim().length < 2) return setMessage("Enter a category name.");
    const scope = await getWorkspaceScope();
    if (!scope.userId || !scope.workspaceId) return setMessage("Please sign in again.");
    const { data, error } = await supabase.from("categories").insert({
      name: newCategory.trim(), workspace_id: scope.workspaceId, created_by: scope.userId,
    }).select("id,name,description,workspace_id").single();
    if (error) return setMessage(error.message);
    setCategories((current) => [...current, data as Category].sort((a, b) => a.name.localeCompare(b.name)));
    setValue("category_id", data.id);
    setNewCategory(""); setShowNew(false); setMessage("Category created and selected.");
  };

  const submit = async (values: ProductValues) => {
    setSaving(true); setMessage("");
    const result = await onSave(values);
    setSaving(false);
    if (result.error) setMessage(result.error);
  };

  const input = "mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none focus:border-emerald-400";
  return <form onSubmit={handleSubmit(submit)} className="mt-8 space-y-7">
    <div className="grid gap-6 sm:grid-cols-2">
      <label className="text-sm text-slate-300">Product name<input {...register("name")} className={input}/><Error text={formState.errors.name?.message}/></label>
      <label className="text-sm text-slate-300">SKU<input {...register("sku")} className={input}/><Error text={formState.errors.sku?.message}/></label>
      <label className="text-sm text-slate-300">Category
        <select {...register("category_id")} className={input}><option value="">Uncategorized</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </label>
      <div className="self-end"><button type="button" onClick={() => setShowNew(!showNew)} className="rounded-full bg-slate-800 px-4 py-3 text-sm text-emerald-300">+ Add new category</button></div>
    </div>
    {showNew && <div className="flex flex-col gap-3 rounded-2xl bg-slate-950/70 p-4 sm:flex-row"><input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Category name" className={input}/><button type="button" onClick={createCategory} className="rounded-full bg-emerald-500 px-5 py-3 font-semibold text-slate-950">Create</button></div>}
    <label className="block text-sm text-slate-300">Description<textarea rows={3} {...register("description")} className={input}/></label>
    <div className="grid gap-6 sm:grid-cols-3">
      <NumberField label="Opening stock" name="quantity" register={register} error={formState.errors.quantity?.message}/>
      <NumberField label="Cost price" name="cost_price" register={register} error={formState.errors.cost_price?.message} step="0.01"/>
      <NumberField label="Selling price" name="selling_price" register={register} error={formState.errors.selling_price?.message} step="0.01"/>
      <NumberField label="Reorder threshold" name="reorder_threshold" register={register} error={formState.errors.reorder_threshold?.message}/>
      <NumberField label="Overstock threshold" name="overstock_threshold" register={register} error={formState.errors.overstock_threshold?.message}/>
      <label className="text-sm text-slate-300">Unit of measurement<input {...register("unit")} placeholder="unit, kg, box…" className={input}/></label>
    </div>
    <div className="grid gap-6 sm:grid-cols-2">
      <label className="text-sm text-slate-300">Supplier<input {...register("supplier")} className={input}/></label>
      <label className="text-sm text-slate-300">Barcode<input {...register("barcode")} className={input}/></label>
      <label className="text-sm text-slate-300">Expiry date<input type="date" {...register("expiry_date")} className={input}/></label>
      <label className="text-sm text-slate-300">Product image URL<input type="url" {...register("image_url")} className={input}/><Error text={formState.errors.image_url?.message}/></label>
    </div>
    {message && <p className="text-sm text-amber-300">{message}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button disabled={saving} className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-slate-950 disabled:opacity-60">{saving ? "Saving…" : submitLabel}</button>
      <Link href="/products" className="text-sm font-semibold text-emerald-300">Back to products</Link>
    </div>
  </form>;
}

function Error({ text }: { text?: string }) { return text ? <span className="mt-1 block text-xs text-rose-400">{text}</span> : null; }
function NumberField({ label, name, register, error, step = "1" }: { label: string; name: "quantity"|"cost_price"|"selling_price"|"reorder_threshold"|"overstock_threshold"; register: ReturnType<typeof useForm<ProductValues>>["register"]; error?: string; step?: string }) {
  return <label className="text-sm text-slate-300">{label}<input type="number" min="0" step={step} {...register(name, { valueAsNumber: name !== "overstock_threshold" })} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3"/><Error text={error}/></label>;
}
