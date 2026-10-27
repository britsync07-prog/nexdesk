"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/header";
import { RecordForm } from "@/components/record-form";

export default function AddRecordPage() {
  const router = useRouter();
  const [record, setRecord] = useState<Record<string, unknown> | undefined>();
  const [ready, setReady] = useState(false);
  useEffect(() => { fetch("/api/auth/session").then(r => r.json()).then(({ user }) => { if (!user) router.replace("/login"); }).catch(() => router.replace("/login")); }, [router]);
  useEffect(() => { const recordId = new URLSearchParams(window.location.search).get("edit"); if (!recordId) { setReady(true); return; } fetch(`/api/records/${recordId}`).then(r => r.json()).then(data => setRecord(data.record)).finally(() => setReady(true)); }, []);
  if (!ready) return <div className="min-h-screen grid place-items-center text-zinc-400 text-sm">Loading record…</div>;
  return <div className="nex-app min-h-screen bg-[#e4eae6] p-2 md:pl-[236px]"><Header /><div className="mx-auto min-h-[calc(100svh-1rem)] max-w-4xl rounded-[16px] border border-[#e8eaec] bg-white px-4 py-6 space-y-6 md:px-8"><div className="flex items-center justify-between"><Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-zinc-500"><ArrowLeft className="w-3.5 h-3.5" />Back to Dashboard</Link><span className="text-xs text-[#1b6c80]">{record ? "Edit mode" : "New entry"}</span></div><div><h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#131416]">{record ? "Edit shift record" : "New factory shift record"}</h1><p className="mt-1 text-sm text-[#5d5f60]">Record shift attendance, supervisor details, worker headcounts, and custom data.</p></div><div className="rounded-lg border border-[#e8eaec] bg-white p-5"><RecordForm initialRecord={record as never} /></div></div></div>;
}
