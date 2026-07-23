import Link from "next/link";
import { Activity, BarChart3, Boxes, ShieldCheck } from "lucide-react";

const groups = [
  { title: "Product", links: [{ label: "Inventory", href: "/products" }, { label: "Stock activity", href: "/stock-movements" }, { label: "Analytics", href: "/dashboard" }, { label: "Categories", href: "/categories" }] },
  { title: "Account", links: [{ label: "Create account", href: "/sign-up" }, { label: "Sign in", href: "/sign-in" }, { label: "Reset password", href: "/forgot-password" }] },
];

export default function SiteFooter() {
  return <footer className="border-t border-white/10 bg-slate-950 px-6 pb-10 pt-20 text-slate-300 sm:px-12 lg:px-16"><div className="mx-auto max-w-7xl">
    <div className="overflow-hidden rounded-[2rem] border border-emerald-400/15 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-900 p-8 shadow-2xl shadow-black/20 sm:p-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-300">Better stock decisions start here</p><h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">Turn everyday inventory activity into confident business growth.</h2><p className="mt-4 max-w-2xl leading-7 text-slate-400">Keep products organized, understand what sells, and know what needs your attention before it becomes a problem.</p></div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col"><Link href="/sign-up" className="rounded-full bg-emerald-400 px-6 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-emerald-300">Start using LOTrack</Link><Link href="/sign-in" className="rounded-full border border-slate-700 bg-slate-950/50 px-6 py-3 text-center text-sm font-semibold text-white transition hover:border-emerald-400/60">Sign in</Link></div>
      </div>
    </div>
    <div className="grid gap-12 px-1 py-14 md:grid-cols-[1.4fr_1fr_1fr]"><div><Link href="/" aria-label="LOTrack home" className="inline-flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400 text-slate-950"><Boxes className="h-6 w-6" /></span><span className="text-2xl font-semibold tracking-tight text-white">LO<span className="text-emerald-400">Track</span></span></Link><p className="mt-5 max-w-md text-sm leading-7 text-slate-400">A practical inventory workspace for growing retailers, wholesalers, pharmacies, restaurants, and modern merchant teams.</p>
      <div className="mt-6 flex flex-wrap gap-3 text-xs font-medium text-slate-400"><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900 px-3 py-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Secure workspaces</span><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900 px-3 py-2"><Activity className="h-4 w-4 text-cyan-400" /> Live stock activity</span><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900 px-3 py-2"><BarChart3 className="h-4 w-4 text-amber-300" /> Real analytics</span></div></div>
      {groups.map(group => <nav key={group.title} aria-label={`${group.title} links`}><h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-200">{group.title}</h3><ul className="mt-5 space-y-3">{group.links.map(link => <li key={link.href}><Link href={link.href} className="text-sm text-slate-400 transition hover:text-emerald-300">{link.label}</Link></li>)}</ul></nav>)}
    </div>
    <div className="flex flex-col gap-3 border-t border-white/10 pt-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} LOTrack. Built to help businesses know their stock.</p><p>Inventory clarity · Smarter decisions · Sustainable growth</p></div>
  </div></footer>;
}
