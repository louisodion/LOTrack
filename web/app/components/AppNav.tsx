"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/products", label: "Products" },
  { href: "/categories", label: "Categories" },
  { href: "/stock-movements", label: "Activity" },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/80 px-6 py-4 shadow-xl shadow-slate-950/20 sm:flex-row sm:items-center sm:justify-between">
      <Link href="/dashboard" className="text-xl font-semibold tracking-tight text-white">
        LO<span className="text-emerald-400">Track</span>
      </Link>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => {
          const active = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(`${link.href}/`));
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active ? "bg-emerald-500 text-slate-950" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
