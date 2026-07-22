export default function LoadingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="inline-flex items-center gap-3 rounded-3xl border border-white/10 bg-slate-900/80 px-8 py-6 text-sm shadow-xl shadow-slate-950/20">
        <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
        Loading LOTrack…
      </div>
    </div>
  );
}
