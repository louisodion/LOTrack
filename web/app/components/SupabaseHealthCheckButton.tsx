"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function SupabaseHealthCheckButton() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkConnection = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const { error } = await supabase.auth.getSession();

      if (error) {
        setStatus("❌ Unable to connect to Supabase: " + error.message);
      } else {
        setStatus("✅ Supabase connection is working.");
      }
    } catch {
      setStatus(
        "❌ Error checking Supabase connection. Please verify your .env values and network."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 rounded-3xl border border-white/10 bg-slate-950/80 p-6 text-left shadow-lg shadow-black/20">
      <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">
        Supabase connection check
      </p>
      <p className="mt-3 text-base leading-7 text-slate-200">
        Press the button below to verify your app can reach Supabase using the configured URL and anon key.
      </p>
      <button
        type="button"
        onClick={checkConnection}
        disabled={loading}
        className="mt-6 inline-flex items-center justify-center rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Checking..." : "Check Supabase Connection"}
      </button>
      {status ? (
        <p className="mt-4 text-sm text-slate-200" aria-live="polite">
          {status}
        </p>
      ) : null}
    </div>
  );
}
