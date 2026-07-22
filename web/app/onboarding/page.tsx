"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/app/components/AuthGuard";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { onboardingSchema } from "@/lib/schemas";
import { ensureWorkspaceForCurrentUser } from "@/lib/workspace";
import { supabase } from "@/lib/supabaseClient";
import type { z } from "zod";

type OnboardingValues = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loadingDefaults, setLoadingDefaults] = useState(true);

  const { register, handleSubmit, formState, reset } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      businessName: "",
      businessType: "retail",
      currency: "NGN",
      defaultLowStockThreshold: 5,
    },
  });

  useEffect(() => {
    const loadDefaults = async () => {
      const { data } = await supabase.auth.getSession();
      const metadata = data.session?.user.user_metadata ?? {};

      reset({
        businessName: metadata.business_name ?? "",
        businessType: metadata.business_type ?? "retail",
        currency: metadata.currency ?? "NGN",
        defaultLowStockThreshold:
          typeof metadata.default_low_stock_threshold === "number"
            ? metadata.default_low_stock_threshold
            : Number(metadata.default_low_stock_threshold) || 5,
      });
      setLoadingDefaults(false);
    };

    loadDefaults();
  }, [reset]);

  const onSubmit = async ({ businessName, businessType, currency, defaultLowStockThreshold }: OnboardingValues) => {
    setLoading(true);
    setAuthError(null);
    setSubmitted(false);

    const { error } = await ensureWorkspaceForCurrentUser({
      business_name: businessName,
      business_type: businessType,
      currency,
      default_low_stock_threshold: defaultLowStockThreshold,
    });

    setLoading(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    setSubmitted(true);
    router.push("/dashboard");
  };

  return (
    <AuthGuard>
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100 sm:px-12 lg:px-16">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-slate-900/80 p-10 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
          <div className="mb-8 space-y-4">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Business onboarding</p>
            <h1 className="text-3xl font-semibold text-white">Tell us about your business.</h1>
            <p className="text-slate-400">Complete onboarding to start using LOTrack with your own workspace.</p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {loadingDefaults ? (
              <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/70 p-8 text-center text-slate-400">
                Loading your onboarding details…
              </div>
            ) : null}
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-300">
                <span>Business name</span>
                <input
                  {...register("businessName")}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                />
                {formState.errors.businessName ? (
                  <p className="text-xs text-rose-400">{formState.errors.businessName.message}</p>
                ) : null}
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Preferred currency</span>
                <select
                {...register("currency")}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
              >
                  <option value="NGN">Nigerian Naira (NGN)</option>
                  <option value="USD">US Dollar (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </label>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-300">
                <span>Business type</span>
                <select
                  {...register("businessType")}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="retail">Retail</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="wholesale">Wholesale</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Default low stock threshold</span>
                <input
                  type="number"
                  min={1}
                  defaultValue={5}
                  {...register("defaultLowStockThreshold", { valueAsNumber: true })}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {loading ? "Finishing onboarding..." : "Complete onboarding"}
            </button>
            {authError ? <p className="text-sm text-rose-400">{authError}</p> : null}
            {submitted ? <p className="text-sm text-emerald-300">Onboarding complete. Redirecting to dashboard…</p> : null}
          </form>
        </div>
      </main>
    </AuthGuard>
  );
}
