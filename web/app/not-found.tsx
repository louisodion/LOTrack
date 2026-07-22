import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-24 text-slate-100 sm:px-12">
      <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-white/10 bg-slate-900/80 p-12 text-center shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Page not found</p>
        <h1 className="mt-6 text-4xl font-semibold text-white">We couldn’t find that page.</h1>
        <p className="mt-4 text-base leading-7 text-slate-400">The link may be broken or the page may have been moved.</p>
        <div className="mt-8">
          <Link href="/" className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400">
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}
