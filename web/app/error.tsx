"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-24 text-slate-100 sm:px-12">
      <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-white/10 bg-slate-900/80 p-12 text-center shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Something went wrong</p>
        <h1 className="mt-6 text-4xl font-semibold text-white">An unexpected error occurred.</h1>
        <p className="mt-4 text-base leading-7 text-slate-400">Please try again or return to the dashboard.</p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button onClick={() => reset()} className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400">
            Retry
          </button>
          <Link href="/" className="rounded-full border border-slate-700 bg-slate-900/80 px-6 py-3 text-sm font-semibold text-white transition hover:border-slate-500">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
