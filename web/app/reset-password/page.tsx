"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema } from "@/lib/schemas";
import { supabase } from "@/lib/supabaseClient";
import type { z } from "zod";

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const accessToken = searchParams.get("access_token");
  const refreshToken = searchParams.get("refresh_token");
  const hasValidToken = Boolean(accessToken);
  const tokenError = !hasValidToken
    ? "No password recovery token found. Please use the link sent to your email."
    : null;

  const { register, handleSubmit, formState } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async ({ password }: ResetPasswordValues) => {
    if (!accessToken) return;

    setLoading(true);
    setAuthError(null);
    setMessage(null);

    if (refreshToken) {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setAuthError(error.message);
      return;
    }

    setMessage("Password updated successfully. You can now sign in with your new password.");
    setTimeout(() => {
      router.push("/sign-in");
    }, 1200);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-24 text-slate-100 sm:px-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 rounded-[2rem] border border-white/10 bg-slate-900/80 p-10 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
        <div className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Reset password</p>
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">Choose a new password.</h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-slate-400">
            Enter a secure password and confirm to update your account.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/70 p-8">
          <label className="space-y-2 text-sm text-slate-300">
            <span>New password</span>
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
            <span>Confirm password</span>
            <input
              type="password"
              {...register("confirmPassword")}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
            />
            {formState.errors.confirmPassword ? (
              <p className="text-xs text-rose-400">{formState.errors.confirmPassword.message}</p>
            ) : null}
          </label>
          {tokenError ? <p className="text-sm text-rose-400">{tokenError}</p> : null}
          {authError ? <p className="text-sm text-rose-400">{authError}</p> : null}
          {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
          <button
            type="submit"
            disabled={!hasValidToken || loading}
            className="w-full rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? "Updating password..." : "Reset password"}
          </button>
          <p className="text-center text-sm text-slate-400">
            Back to{' '}
            <Link href="/sign-in" className="text-emerald-300 hover:text-emerald-200">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
