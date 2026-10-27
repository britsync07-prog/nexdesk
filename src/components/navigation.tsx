"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ContactRound, Landmark, LayoutDashboard, PlusCircle, ReceiptText, Settings } from "lucide-react";
import { useShopLanguage } from "@/components/shop-language";
import { copy } from "@/lib/shop";

export function Navigation() {
  const pathname = usePathname();
  const { language, setLanguage } = useShopLanguage();
  const t = copy(language);
  if (["/", "/login", "/privacy", "/terms"].includes(pathname)) return null;
  const items = [
    ["/dashboard", t.dashboard, LayoutDashboard],
    ["/add-transaction", t.add, PlusCircle],
    ["/transactions", t.history, ReceiptText],
    ["/contacts", t.people, ContactRound],
    ["/settings", t.settings, Settings],
  ] as const;
  return <>
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 border-r border-[#e6e6e6] bg-[#f2f4f7] px-3 py-5 md:flex md:flex-col">
      <a href="/dashboard" className="flex items-center gap-2 px-2 text-[#0a0a0a]"><Landmark className="h-5 w-5" /><span className="text-base font-semibold">{t.appName}</span></a>
      <p className="mt-2 px-2 text-xs text-[#6b6b6b]">{t.subtitle}</p>
      <nav className="mt-9 space-y-1">{items.map(([href, label, Icon]) => <a key={href} href={href} className={`flex h-10 items-center gap-2 rounded-md px-3 text-sm ${pathname === href || pathname.startsWith(`${href}/`) ? "bg-white font-medium text-[#0a0a0a]" : "text-[#5f6368] hover:bg-white/70"}`}><Icon className="h-4 w-4" />{label}</a>)}</nav>
      <button onClick={() => setLanguage(language === "en" ? "bn" : "en")} className="mt-auto h-10 rounded-md border border-[#d4d4d4] bg-white text-sm font-medium text-[#0a0a0a]">{t.language}</button>
    </aside>
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#e6e6e6] bg-white px-4 md:hidden"><a href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-[#0a0a0a]"><Landmark className="h-5 w-5" />{t.appName}</a><button onClick={() => setLanguage(language === "en" ? "bn" : "en")} className="rounded-md border border-[#d4d4d4] px-3 py-1.5 text-sm font-medium text-[#0a0a0a]">{t.language}</button></header>
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e6e6e6] bg-white md:hidden"><div className="flex h-16 items-center justify-around">{items.map(([href, label, Icon]) => <a key={href} href={href} className={`flex min-w-0 flex-1 flex-col items-center gap-1 text-[10px] ${pathname === href ? "text-[#0a0a0a]" : "text-[#6b6b6b]"}`}><Icon className="h-5 w-5" /><span className="truncate">{label}</span></a>)}</div></nav>
  </>;
}
