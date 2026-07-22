import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-24 text-slate-100 sm:px-12">
      <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-white/10 bg-slate-900/80 p-12 text-center shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Unauthorized</p>
        <h1 className="mt-6 text-4xl font-semibold text-white">You do not have permission to access this page.</h1>
        <p className="mt-4 text-base leading-7 text-slate-400">
          Sign in with a different account or contact your business owner if you believe this is an error.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href="/sign-in" className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400">
            Return to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
