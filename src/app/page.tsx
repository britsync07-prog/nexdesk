"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => { if (data.user) router.replace("/dashboard"); })
      .catch(() => {});
  }, [router]);

  return (
    <div className="min-h-[100svh] bg-[#edf0ec] text-[#17201d] selection:bg-[#d7e475] selection:text-[#17201d]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="NexDesk home">
          <BrandMark className="h-9 w-9 text-[#244d3c]" />
          <span className="text-lg font-semibold tracking-[-0.04em]">NexDesk</span>
        </Link>
        <Link href="/login" className="rounded-full bg-[#17201d] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#244d3c]">Sign in</Link>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-end lg:pb-28 lg:pt-24">
          <div className="max-w-3xl nex-reveal">
            <h1 className="max-w-3xl text-5xl font-semibold leading-[.92] tracking-[-0.065em] sm:text-7xl lg:text-8xl">Every shift stays on the record.</h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-[#52615a]">NexDesk gives supervisors one reliable place to capture people, locations, handovers and the work that happened—then sends the record where the team needs it.</p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-[#d7e475] px-5 py-3 text-sm font-semibold text-[#17201d] transition hover:bg-[#c8d95a]">Start a shift <ArrowUpRight className="h-4 w-4" /></Link>
              <span className="text-sm text-[#64746b]">Google sign-in · Your Sheets</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] bg-[#244d3c] p-4 text-[#edf0ec] sm:p-6 nex-reveal nex-reveal-delay">
            <div className="rounded-[1.4rem] bg-[#edf0ec] p-5 text-[#17201d] sm:p-7" data-ui>
              <div className="flex items-start justify-between">
                <div><p className="text-xs font-medium text-[#52715d]">Today’s shift entry</p><p className="mt-1 text-2xl font-semibold tracking-[-0.04em]">Line 03 · Day</p></div>
                <span className="rounded-full bg-[#d7e475] px-3 py-1 text-xs font-semibold">Ready to log</span>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 text-sm">
                <div><p className="text-[#718078]">Supervisor</p><p className="mt-1 font-medium">Add a name</p></div>
                <div><p className="text-[#718078]">Personnel</p><p className="mt-1 font-medium">1–20 workers</p></div>
                <div><p className="text-[#718078]">Location</p><p className="mt-1 font-medium">Factory section</p></div>
                <div><p className="text-[#718078]">Destination</p><p className="mt-1 font-medium">Google Sheets</p></div>
              </div>
              <div className="mt-8 flex items-center gap-3 rounded-2xl bg-[#e6e5dd] px-4 py-3 text-sm"><span className="h-2.5 w-2.5 rounded-full bg-[#52715d]" />A record is ready when you are.</div>
            </div>
          </div>
        </section>

        <section className="bg-[#17201d] px-5 py-16 text-[#edf0ec] sm:px-8 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr]">
            <h2 className="max-w-sm text-3xl font-semibold leading-tight tracking-[-0.045em] sm:text-5xl">A shift has a rhythm.</h2>
            <div className="grid gap-8 sm:grid-cols-3">
              {[['Capture', 'Date, shift, crew and notes in one focused entry.'], ['Find', 'Filter the history by person, location, supervisor or shift.'], ['Share', 'Create, connect and sync the team spreadsheet.']].map(([title, text]) => <article key={title}><span className="mb-5 flex h-8 w-8 items-center justify-center rounded-full bg-[#d7e475] text-sm font-bold text-[#17201d]"><Check className="h-4 w-4" /></span><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 leading-7 text-[#bdc8c0]">{text}</p></article>)}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-7 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2">
          <article className="rounded-[1.75rem] bg-[#e1e5df] p-7 sm:p-10"><FileSpreadsheet className="h-7 w-7 text-[#52715d]" /><h2 className="mt-12 text-3xl font-semibold tracking-[-0.045em]">Your records stay usable.</h2><p className="mt-3 max-w-md leading-7 text-[#52615a]">NexDesk keeps the working record in your account and gives you a clean path to Google Sheets when your team needs the wider view.</p></article>
          <article className="rounded-[1.75rem] bg-[#d7e475] p-7 sm:p-10"><ShieldCheck className="h-7 w-7 text-[#244d3c]" /><h2 className="mt-12 text-3xl font-semibold tracking-[-0.045em]">Made for the person on the floor.</h2><p className="mt-3 max-w-md leading-7 text-[#365744]">Large controls, a focused workflow and a history that does not make you remember where you put yesterday’s details.</p><Link href="/login" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold underline decoration-2 underline-offset-4">Open NexDesk <ArrowUpRight className="h-4 w-4" /></Link></article>
        </section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-col gap-5 px-5 pb-8 sm:flex-row sm:items-end sm:justify-between sm:px-8"><div className="flex items-center gap-2"><BrandMark className="h-6 w-6 text-[#244d3c]" /><span className="font-semibold tracking-[-0.03em]">NexDesk</span></div><div className="flex gap-5 text-sm text-[#52615a]"><Link href="/privacy" className="hover:text-[#17201d]">Privacy</Link><Link href="/terms" className="hover:text-[#17201d]">Terms</Link></div></footer>
    </div>
  );
}
