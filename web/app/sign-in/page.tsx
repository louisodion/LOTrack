"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema } from "@/lib/schemas";
import { supabase } from "@/lib/supabaseClient";
import type { z } from "zod";

type SignInValues = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async ({ email, password }: SignInValues) => {
    setLoading(true);
    setAuthError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next");
    router.push(next?.startsWith("/") ? next : "/dashboard");
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-24 text-slate-100 sm:px-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 rounded-[2rem] border border-white/10 bg-slate-900/80 p-10 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
        <div className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Sign in to LOTrack</p>
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">Welcome back.</h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-slate-400">
            Enter your credentials to continue to your business dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/70 p-8">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
            />
            {formState.errors.email ? (
              <p className="text-xs text-rose-400">{formState.errors.email.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              {...register("password")}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
            />
            {formState.errors.password ? (
              <p className="text-xs text-rose-400">{formState.errors.password.message}</p>
            ) : null}
          </div>
          <div className="flex items-center justify-between text-sm text-slate-400">
            <Link href="/forgot-password" className="hover:text-white">
              Forgot password?
            </Link>
            <Link href="/sign-up" className="text-emerald-300 hover:text-emerald-200">
              Create account
            </Link>
          </div>
          {authError ? <p className="text-sm text-rose-400">{authError}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
