"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema } from "@/lib/schemas";
import { supabase } from "@/lib/supabaseClient";
import type { z } from "zod";

type SignUpValues = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async ({ fullName, businessName, email, password }: SignUpValues) => {
    setLoading(true);
    setAuthError(null);
    setMessage(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          business_name: businessName,
        },
      },
    });

    setLoading(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    if (data?.session) {
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next?.startsWith("/") ? next : "/onboarding");
      return;
    }

    setMessage("Account created. Check your email to verify your address and sign in once verification is complete.");
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-24 text-slate-100 sm:px-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 rounded-[2rem] border border-white/10 bg-slate-900/80 p-10 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
        <div className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Create your workspace</p>
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">Start your free trial.</h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-slate-400">
            Register your business and begin tracking inventory with LOTrack.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/70 p-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-300">
              <span>Name</span>
              <input
                type="text"
                {...register("fullName")}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
              />
              {formState.errors.fullName ? (
                <p className="text-xs text-rose-400">{formState.errors.fullName.message}</p>
              ) : null}
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              <span>Email</span>
              <input
                type="email"
                {...register("email")}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
              />
              {formState.errors.email ? (
                <p className="text-xs text-rose-400">{formState.errors.email.message}</p>
              ) : null}
            </label>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-300">
              <span>Password</span>
              <input
                type="password"
                {...register("password")}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
              />
              {formState.errors.password ? (
                <p className="text-xs text-rose-400">{formState.errors.password.message}</p>
              ) : null}
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              <span>Business name</span>
              <input
                type="text"
                {...register("businessName")}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
              />
              {formState.errors.businessName ? (
                <p className="text-xs text-rose-400">{formState.errors.businessName.message}</p>
              ) : null}
            </label>
          </div>
          {authError ? <p className="text-sm text-rose-400">{authError}</p> : null}
          {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
          <p className="text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link href="/sign-in" className="text-emerald-300 hover:text-emerald-200">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
