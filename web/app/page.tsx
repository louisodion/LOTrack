import Link from "next/link";
import SiteFooter from "./components/SiteFooter";
import { Activity, Box, Database, ShieldCheck } from "lucide-react";

const features = [
  {
    title: "Track stock levels",
    description: "See current inventory, low stock, and out-of-stock products at a glance.",
    icon: Box,
  },
  {
    title: "Record stock changes",
    description: "Log stock in, stock out, sales, returns, and adjustments with full audit history.",
    icon: Activity,
  },
  {
    title: "Manage your team",
    description: "Invite staff, assign permissions, and keep everyone working in the right workspace.",
    icon: ShieldCheck,
  },
  {
    title: "Secure multi-tenant data",
    description: "Each business has its own private workspace and secure access controls.",
    icon: Database,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="relative overflow-hidden px-6 py-20 sm:px-12 lg:px-16">
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-emerald-600/20 to-transparent blur-3xl" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-16">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.24em] text-emerald-200 shadow-sm shadow-emerald-500/10">
                LOTrack for modern inventory teams
              </div>
              <div className="space-y-6">
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Know your stock, stop stockouts, and grow your business.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                  LOTrack makes inventory simple for retailers, restaurants, pharmacies, and wholesalers with a secure dashboard, stock alerts, staff management, and activity history.
                </p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                >
                  Start free trial
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 px-6 py-3 text-sm font-semibold text-white transition hover:border-slate-500"
                >
                  Sign in
                </Link>
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
              <div className="space-y-6">
                <div className="rounded-3xl border border-emerald-500/10 bg-emerald-500/5 p-6">
                  <p className="text-sm uppercase tracking-[0.24em] text-emerald-300">Dashboard preview</p>
                  <p className="mt-3 text-base leading-7 text-slate-200">
                    A clean inventory workspace with quick actions, stock alerts, and recent activity for your business.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl bg-slate-950/90 p-4">
                    <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Total products</p>
                    <p className="mt-2 text-3xl font-semibold text-white">1,238</p>
                  </div>
                  <div className="rounded-3xl bg-slate-950/90 p-4">
                    <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Low stock</p>
                    <p className="mt-2 text-3xl font-semibold text-amber-300">18</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/20">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="mt-6 text-xl font-semibold text-white">{feature.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-slate-950/80 py-20 px-6 sm:px-12 lg:px-16">
        <div className="mx-auto max-w-6xl space-y-12">
          <div className="space-y-4 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">How it works</p>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">Inventory that works the way your business does.</h2>
            <p className="mx-auto max-w-3xl text-base leading-8 text-slate-400">
              LOTrack gives your team a single source of truth for products, stock movement, suppliers, staff permissions, and business performance.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl bg-slate-900/80 p-8 shadow-xl shadow-slate-950/10">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">Plan</p>
              <p className="mt-4 text-lg font-semibold text-white">Set up your business</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">Create your workspace and configure stock rules so every product is tracked correctly.</p>
            </div>
            <div className="rounded-3xl bg-slate-900/80 p-8 shadow-xl shadow-slate-950/10">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">Track</p>
              <p className="mt-4 text-lg font-semibold text-white">Monitor stock changes</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">Log stock in, stock out, sales, returns, and adjustments with full history and the user responsible.</p>
            </div>
            <div className="rounded-3xl bg-slate-900/80 p-8 shadow-xl shadow-slate-950/10">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">Grow</p>
              <p className="mt-4 text-lg font-semibold text-white">Make smarter decisions</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">See alerts for low stock, expired items, and reorder priorities so you never miss an opportunity.</p>
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-10 shadow-2xl shadow-slate-950/20">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-emerald-300">Get started</p>
                <h3 className="mt-4 text-3xl font-semibold text-white">Build a strong inventory system from day one.</h3>
              </div>
              <div className="space-y-4">
                <p className="text-slate-400">Sign up and start using LOTrack with a free trial designed for small businesses. No credit card required.</p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/sign-up" className="inline-flex rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400">
                    Start free trial
                  </Link>
                  <Link href="/sign-in" className="inline-flex rounded-full border border-slate-700 bg-slate-900/80 px-5 py-3 text-sm font-semibold text-white transition hover:border-slate-500">
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-slate-950/90 py-16 px-6 sm:px-12 lg:px-16">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Built for modern merchants</p>
          <p className="mt-3 text-lg leading-8 text-slate-300">
            LOTrack is designed to work on desktop, tablet, and mobile browsers so your team can manage stock anywhere.
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
