"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema } from "@/lib/schemas";
import { supabase } from "@/lib/supabaseClient";
import type { z } from "zod";

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async ({ email }: ForgotPasswordValues) => {
    setLoading(true);
    setAuthError(null);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    setMessage("Reset email sent. Check your inbox for the password reset link.");
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-24 text-slate-100 sm:px-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 rounded-[2rem] border border-white/10 bg-slate-900/80 p-10 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
        <div className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Forgot password</p>
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">Reset your password.</h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-slate-400">
            Enter your email and we’ll send a secure password reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/70 p-8">
          <label className="space-y-2 text-sm text-slate-300">
            <span>Email address</span>
            <input
              type="email"
              {...register("email")}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
            />
            {formState.errors.email ? (
              <p className="text-xs text-rose-400">{formState.errors.email.message}</p>
            ) : null}
          </label>
          {authError ? <p className="text-sm text-rose-400">{authError}</p> : null}
          {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? "Sending link..." : "Send reset link"}
          </button>
          <p className="text-center text-sm text-slate-400">
            Remembered your password?{' '}
            <Link href="/sign-in" className="text-emerald-300 hover:text-emerald-200">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
