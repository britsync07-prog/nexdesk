"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

export default function LoginPage() {
  const [googleUrl, setGoogleUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const message = new URLSearchParams(window.location.search).get("error");
    if (message) setError(message);
    fetch("/api/auth/google/url").then(res => res.json()).then(data => setGoogleUrl(data.url)).catch(() => setError("NexDesk could not reach the sign-in service."));
  }, []);

  return <div className="min-h-[100svh] bg-[#edf0ec] px-5 py-5 text-[#17201d] sm:px-8 sm:py-8">
    <header className="mx-auto flex max-w-6xl items-center justify-between"><Link href="/" className="flex items-center gap-2.5"><BrandMark className="h-9 w-9 text-[#244d3c]" /><span className="text-lg font-semibold tracking-[-0.04em]">NexDesk</span></Link><Link href="/" className="text-sm text-[#52615a] hover:text-[#17201d]">Back to home</Link></header>
    <main className="mx-auto grid max-w-6xl gap-10 py-14 lg:min-h-[calc(100vh-7rem)] lg:grid-cols-[1fr_.8fr] lg:items-center lg:py-0">
      <section><p className="text-sm font-medium text-[#52715d]">Sign in securely</p><h1 className="mt-5 max-w-xl text-5xl font-semibold leading-[.93] tracking-[-0.065em] sm:text-7xl">Start with the shift in front of you.</h1><p className="mt-7 max-w-xl text-lg leading-8 text-[#52615a]">Use your Google account to keep your own records together and connect the spreadsheet your team already relies on.</p><div className="mt-10 grid max-w-xl gap-4 sm:grid-cols-2">{[["Your records", "Each account sees only its own shift history."],["Your choice", "Google Sheets sync is available when you need it."]].map(([title,text]) => <div key={title} className="flex gap-3"><Check className="mt-1 h-4 w-4 shrink-0 text-[#52715d]" /><p className="text-sm leading-6 text-[#52615a]"><strong className="block font-semibold text-[#17201d]">{title}</strong>{text}</p></div>)}</div></section>
      <section className="rounded-[2rem] bg-[#244d3c] p-4 sm:p-6"><div className="rounded-[1.45rem] bg-white p-6 sm:p-9"><BrandMark className="h-11 w-11 text-[#244d3c]" /><h2 className="mt-10 text-3xl font-semibold tracking-[-0.05em]">Continue to NexDesk</h2><p className="mt-3 text-sm leading-6 text-[#617068]">Choose the Google account that should own this workspace.</p>{error && <p className="mt-6 rounded-xl bg-[#f8e8e4] px-4 py-3 text-sm text-[#8b3326]">{error}</p>}{googleUrl ? <a href={googleUrl} className="mt-8 flex items-center justify-between rounded-full bg-[#17201d] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#244d3c]"><span>Continue with Google</span><ArrowUpRight className="h-4 w-4" /></a> : <p className="mt-8 rounded-2xl bg-[#e6e5dd] p-4 text-sm leading-6 text-[#52615a]">Google sign-in is being configured. Please try again shortly.</p>}<div className="mt-7 flex gap-2 text-xs leading-5 text-[#718078]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#52715d]" /><p>By continuing, you agree to the <Link href="/terms" className="underline">Terms</Link> and acknowledge the <Link href="/privacy" className="underline">Privacy Policy</Link>.</p></div></div></section>
    </main>
  </div>;
}
