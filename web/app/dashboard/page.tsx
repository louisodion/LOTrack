"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthGuard from "@/app/components/AuthGuard";
import AppNav from "@/app/components/AppNav";
import { supabase } from "@/lib/supabaseClient";

interface BusinessMetadata {
  business_name?: string;
  business_type?: string;
  currency?: string;
  default_low_stock_threshold?: number | string;
  full_name?: string;
}

type ProductRecord = {
  id: string;
  name: string;
  quantity: number | string;
  price: number | string | null;
  user_id: string;
};

type MovementRecord = {
  id: string;
  product_id: string;
  type: string;
  quantity: number | string;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [businessMetadata, setBusinessMetadata] = useState<BusinessMetadata>({});
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [inventoryValue, setInventoryValue] = useState(0);
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string;
    productId: string;
    productName: string;
    type: string;
    quantity: number;
    created_at: string;
  }>>([]);

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/sign-in");
  };

  useEffect(() => {
    const loadDashboard = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;

      const profilePromise = userId
        ? supabase.from("profiles").select("*").eq("user_id", userId).single()
        : Promise.resolve({ data: null, error: null });

      const productsPromise = userId
        ? supabase.from("products").select("id,name,quantity,price,user_id")
        : Promise.resolve({ data: null, error: null });

      const [profileResult, productsResult] = await Promise.all([profilePromise, productsPromise]);

      const profileData = profileResult.data ?? {};
      setBusinessMetadata(profileData || sessionData.session?.user.user_metadata || {});

      const products: ProductRecord[] = Array.isArray(productsResult.data) ? productsResult.data : [];
      setTotalProducts(products.length);
      setLowStockCount(
        products.filter(
          (item) => Number(item.quantity) > 0 && Number(item.quantity) <= (profileData.default_low_stock_threshold ?? 5),
        ).length,
      );
      setOutOfStockCount(products.filter((item) => Number(item.quantity) === 0).length);
      setInventoryValue(
        products.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price || 0), 0),
      );

      const productMap = new Map(products.map((product) => [product.id, product.name]));
      const { data: movements } = userId
        ? await supabase
            .from("stock_movements")
            .select("id,product_id,type,quantity,created_at")
            .order("created_at", { ascending: false })
            .limit(5)
        : { data: null };

      const movementRecords: MovementRecord[] = Array.isArray(movements) ? movements : [];
      setRecentActivity(
        movementRecords.map((movement) => ({
          id: movement.id,
          productId: movement.product_id,
          productName: productMap.get(movement.product_id) ?? movement.product_id,
          type: movement.type,
          quantity: Number(movement.quantity),
          created_at: movement.created_at,
        })),
      );

      setLoadingMetadata(false);
    };

    loadDashboard();
  }, []);

  return (
    <AuthGuard>
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100 sm:px-12 lg:px-16">
        <div className="mx-auto max-w-6xl space-y-10">
          <AppNav />
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-10 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Business dashboard</p>
                <h1 className="mt-3 text-3xl font-semibold text-white">
                  Welcome back, {businessMetadata.business_name ?? "LOTrack user"}.
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  {loadingMetadata
                    ? "Loading your business details..."
                    : `Manage inventory for your ${businessMetadata.business_type ?? "business"} in ${businessMetadata.currency ?? "NGN"}.`}
                </p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={handleSignOut}
                className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
              >
                {loading ? "Signing out..." : "Sign out"}
              </button>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Total products</p>
                <p className="mt-4 text-4xl font-semibold text-white">
                  {loadingMetadata ? "—" : totalProducts}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Low stock</p>
                <p className="mt-4 text-4xl font-semibold text-amber-300">
                  {loadingMetadata ? "—" : lowStockCount}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Out of stock</p>
                <p className="mt-4 text-4xl font-semibold text-rose-400">
                  {loadingMetadata ? "—" : outOfStockCount}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-950/80 p-6 shadow-xl shadow-slate-950/20">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Inventory value</p>
                <p className="mt-4 text-4xl font-semibold text-white">
                  {loadingMetadata ? "—" : `₦${inventoryValue.toLocaleString()}`}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-10 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">Recent inventory activity</h2>
                <p className="mt-2 text-slate-400">Track the latest stock updates for your products.</p>
              </div>
              <a href="/stock-movements" className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400">
                View full activity
              </a>
            </div>

            <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80">
              {recentActivity.length === 0 ? (
                <div className="p-8 text-slate-400">No recent activity yet. Add stock movements to populate the activity feed.</div>
              ) : (
                <table className="min-w-full divide-y divide-slate-800 text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-400">
                    <tr>
                      <th className="px-6 py-4 uppercase tracking-[0.18em]">Product</th>
                      <th className="px-6 py-4 uppercase tracking-[0.18em]">Type</th>
                      <th className="px-6 py-4 uppercase tracking-[0.18em]">Qty</th>
                      <th className="px-6 py-4 uppercase tracking-[0.18em]">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950/80">
                    {recentActivity.map((activity) => (
                      <tr key={activity.id} className="transition hover:bg-slate-900/70">
                        <td className="px-6 py-4 font-medium text-white">{activity.productName}</td>
                        <td className="px-6 py-4 capitalize">{activity.type.replace("_", " ")}</td>
                        <td className="px-6 py-4">{activity.quantity}</td>
                        <td className="px-6 py-4">{new Date(activity.created_at).toLocaleString()}</td>
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
