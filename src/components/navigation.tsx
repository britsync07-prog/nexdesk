"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, LayoutDashboard, PlusCircle, Settings } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Log a shift", href: "/add-record", icon: PlusCircle },
  { label: "History", href: "/history", icon: History },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();
  if (["/", "/login", "/privacy", "/terms"].includes(pathname)) return null;

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[228px] flex-col bg-[#e4eae6] px-4 py-5 md:flex">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
          <BrandMark className="h-8 w-8 text-[#1b6c80]" />
          <span className="text-lg font-semibold tracking-[-0.035em] text-[#131416]">NexDesk</span>
        </Link>
        <p className="mt-10 px-2 text-xs text-[#5d5f60]">Factory operations</p>
        <nav className="mt-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return <Link key={item.href} href={item.href} className={`flex h-10 items-center gap-2 rounded-md px-3 text-sm transition-colors ${active ? "bg-white font-medium text-[#131416]" : "text-[#5d5f60] hover:bg-white/60 hover:text-[#131416]"}`}><Icon className="h-4 w-4" />{item.label}</Link>;
          })}
        </nav>
        <div className="mt-auto"><ThemeToggle /><p className="mt-3 px-2 text-xs leading-5 text-[#5d5f60]">A simple desk for every shift.</p></div>
      </aside>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e8eaec] bg-white md:hidden">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return <Link key={item.href} href={item.href} className={`flex min-w-0 flex-1 flex-col items-center gap-1 text-[11px] ${active ? "font-medium text-[#1b6c80]" : "text-[#5d5f60]"}`}><Icon className="h-5 w-5" />{item.label}</Link>;
          })}
        </div>
      </nav>
    </>
  );
}
