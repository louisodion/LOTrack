"use client";

import { useCallback, useEffect, useState } from "react";
import AppNav from "@/app/components/AppNav";
import AuthGuard from "@/app/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { getWorkspaceScope } from "@/lib/workspace";
import { categorySchema } from "@/lib/schemas";
import type { Category, UserRole } from "@/lib/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [role, setRole] = useState<UserRole>("staff");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data }, scope] = await Promise.all([
      supabase.from("categories").select("id,name,description,workspace_id").order("name"),
      getWorkspaceScope(),
    ]);
    setCategories((data ?? []) as Category[]);
    setRole(((scope.profile as { role?: UserRole } | null)?.role ?? "staff"));
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const save = async () => {
    setMessage("");
    const parsed = categorySchema.safeParse({ name, description });
    if (!parsed.success) return setMessage(parsed.error.issues[0]?.message ?? "Check the category");
    const scope = await getWorkspaceScope();
    if (!scope.userId || !scope.workspaceId) return setMessage("Please sign in again.");
    const result = editing
      ? await supabase.from("categories").update({ ...parsed.data, updated_at: new Date().toISOString() }).eq("id", editing)
      : await supabase.from("categories").insert({ ...parsed.data, workspace_id: scope.workspaceId, created_by: scope.userId });
    if (result.error) return setMessage(result.error.message);
    setName(""); setDescription(""); setEditing(null); setMessage("Category saved.");
    await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this category? Products will become uncategorized.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    setMessage(error?.message ?? "Category deleted.");
    if (!error) await load();
  };

  const canManage = role === "owner" || role === "admin";
  return (
    <AuthGuard>
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100 sm:px-12">
        <div className="mx-auto max-w-6xl space-y-8">
          <AppNav />
          <section className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8">
              <p className="text-sm uppercase tracking-[.3em] text-emerald-300">Categories</p>
              <h1 className="mt-3 text-3xl font-semibold">Organize your catalog</h1>
              {canManage ? (
                <div className="mt-8 space-y-4">
                  <label className="block text-sm text-slate-300">Name
                    <input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3" />
                  </label>
                  <label className="block text-sm text-slate-300">Description
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3" />
                  </label>
                  {message && <p className="text-sm text-amber-300">{message}</p>}
                  <div className="flex gap-3">
                    <button onClick={save} className="rounded-full bg-emerald-500 px-5 py-3 font-semibold text-slate-950">{editing ? "Update" : "Create"} category</button>
                    {editing && <button onClick={() => { setEditing(null); setName(""); setDescription(""); }} className="rounded-full bg-slate-800 px-5 py-3">Cancel</button>}
                  </div>
                </div>
              ) : <p className="mt-6 text-slate-400">You can view categories. An owner or administrator manages them.</p>}
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8">
              <h2 className="text-xl font-semibold">All categories</h2>
              <div className="mt-6 space-y-3">
                {loading ? <p className="text-slate-400">Loading categories…</p> : categories.length === 0 ? <p className="text-slate-400">No categories yet. Create one to organize products.</p> : categories.map((category) => (
                  <div key={category.id} className="flex flex-col gap-3 rounded-2xl bg-slate-950/80 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="font-semibold">{category.name}</p><p className="text-sm text-slate-400">{category.description || "No description"}</p></div>
                    {canManage && <div className="flex gap-2">
                      <button onClick={() => { setEditing(category.id); setName(category.name); setDescription(category.description ?? ""); }} className="rounded-full bg-slate-800 px-4 py-2 text-sm">Edit</button>
                      <button onClick={() => remove(category.id)} className="rounded-full bg-rose-500/20 px-4 py-2 text-sm text-rose-300">Delete</button>
                    </div>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </AuthGuard>
  );
}
