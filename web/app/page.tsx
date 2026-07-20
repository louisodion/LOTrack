import SupabaseHealthCheckButton from "./components/SupabaseHealthCheckButton";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-6 py-16 text-slate-100">
      <main className="mx-auto w-full max-w-4xl rounded-3xl border border-white/10 bg-slate-900/80 p-10 shadow-2xl shadow-slate-950/30 backdrop-blur-2xl">
        <div className="space-y-8 text-center">
          <p className="inline-flex rounded-full bg-emerald-500/15 px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.24em] text-emerald-200 shadow-sm shadow-emerald-500/10">
            Welcome to LOTrack
          </p>
          <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            LOTrack
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
            Know your stock. Grow your business.
          </p>
          <div className="mx-auto grid max-w-xl gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-left shadow-lg shadow-black/20">
              <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Inventory visibility</p>
              <p className="mt-3 text-base leading-7 text-slate-200">
                Real-time stock tracking that keeps your inventory accurate and your orders moving.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-left shadow-lg shadow-black/20">
              <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Business growth</p>
              <p className="mt-3 text-base leading-7 text-slate-200">
                Smarter supply decisions, fewer stockouts, and more confidence when scaling your store.
              </p>
            </div>
          </div>
          <SupabaseHealthCheckButton />
        </div>
      </main>
    </div>
  );
}
