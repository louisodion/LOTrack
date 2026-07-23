"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Users } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function InvitePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const invitationToken = new URLSearchParams(window.location.search).get("token") ?? "";
    void supabase.auth.getSession().then(({ data }) => {
      setToken(invitationToken); setSignedIn(Boolean(data.session)); setLoading(false);
    });
  }, []);
  const accept = async () => {
    setLoading(true); setMessage("");
    if (!token) { setMessage("This invitation link is incomplete."); setLoading(false); return; }
    const { error } = await supabase.rpc("accept_workspace_invitation", { p_token: token });
    if (error) { setMessage(error.message); setLoading(false); return; }
    await supabase.auth.refreshSession();
    setMessage("Invitation accepted. Opening your workspace…");
    setTimeout(() => router.push("/dashboard"), 800);
  };
  const nextPath = `/invite?token=${token}`;
  return <main className="grid min-h-screen place-items-center bg-slate-950 px-6 py-16 text-slate-100"><section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-900/85 p-9 text-center shadow-2xl">
    <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-500/15 text-emerald-300"><Users className="h-8 w-8"/></span>
    <p className="mt-6 text-sm uppercase tracking-[.3em] text-emerald-300">LOTrack team invitation</p><h1 className="mt-3 text-3xl font-semibold">Join your business workspace</h1><p className="mt-4 leading-7 text-slate-400">Accept this invitation to access the shared product catalog and the tools assigned to your role.</p>
    {message&&<p className="mt-6 rounded-2xl bg-slate-950 p-4 text-sm text-amber-200">{message}</p>}
    {loading?<p className="mt-8 text-slate-400">Checking invitation…</p>:signedIn?<button onClick={accept} className="mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 font-semibold text-slate-950"><CheckCircle2 className="h-5 w-5"/>Accept invitation</button>:
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"><Link href={`/sign-in?next=${encodeURIComponent(nextPath)}`} className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-slate-950">Sign in to accept</Link><Link href={`/sign-up?next=${encodeURIComponent(nextPath)}`} className="rounded-full border border-slate-700 px-6 py-3 font-semibold">Create account</Link></div>}
  </section></main>;
}
