"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, FileSpreadsheet, Plus, Users } from "lucide-react";
import { Header } from "@/components/header";
import type { RecordItem } from "@/components/record-card";

type Session = { id: string; email: string; name: string | null };
type SyncState = { spreadsheetId?: string; spreadsheetName?: string; syncStatus?: string };
type RecordSummary = { dayShifts: number; nightShifts: number; personnel: number };

const today = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" });

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<Session | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [summary, setSummary] = useState<RecordSummary>({ dayShifts: 0, nightShifts: 0, personnel: 0 });
  const [sync, setSync] = useState<SyncState>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/session").then((response) => response.json()),
      fetch("/api/records?limit=5").then((response) => response.json()),
      fetch("/api/sync").then((response) => response.json()),
    ])
      .then(([session, recordData, syncData]) => {
        if (!session.user) return router.replace("/login");
        setUser(session.user);
        setRecords(recordData.records || []);
        setTotalRecords(recordData.total || 0);
        setSummary(recordData.summary || { dayShifts: 0, nightShifts: 0, personnel: 0 });
        setSync(syncData);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  const recent = records.slice(0, 5);

  return (
    <div className="nex-app min-h-[100svh] bg-[#e4eae6] p-2 md:pl-[236px]">
      <Header />
      <main className="min-h-[calc(100svh-1rem)] rounded-[16px] border border-[#e8eaec] bg-white px-5 py-7 sm:px-8 md:px-10 md:py-9">
        <div className="mx-auto max-w-6xl space-y-8">
          <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-[#5d5f60]">{today.format(new Date())}</p>
              <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.035em] text-[#131416]">Shift desk</h1>
              <p className="mt-2 text-sm text-[#5d5f60]">
                {totalRecords
                  ? `${totalRecords} logged shifts with ${summary.personnel} people recorded.`
                  : "Start the shift history with the first supervisor log."}
              </p>
            </div>
            <Link
              href="/add-record"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#131416] px-4 text-sm font-medium text-white transition-colors hover:bg-[#2d3032] focus:outline-none focus:ring-2 focus:ring-[#1b6c80] focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" /> Log a shift
            </Link>
          </header>

          <section aria-label="Shift totals" className="grid divide-y divide-[#e8eaec] overflow-hidden rounded-lg border border-[#e8eaec] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            {[
              ["Logged shifts", totalRecords],
              ["Day shifts", summary.dayShifts],
              ["Night shifts", summary.nightShifts],
              ["Personnel", summary.personnel],
            ].map(([label, value]) => (
              <div key={String(label)} className="px-5 py-4">
                <p className="text-sm text-[#5d5f60]">{label}</p>
                <p className="mt-1 text-[27px] font-medium tabular-nums tracking-[-0.035em] text-[#131416]">{value}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-lg border border-[#e8eaec]">
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-[#131416]">Recent shift logs</h2>
                  <p className="mt-1 text-sm text-[#5d5f60]">The latest work captured by your supervisors.</p>
                </div>
                <Link href="/history" className="hidden items-center gap-1 text-sm font-medium text-[#1b6c80] hover:text-[#135464] sm:inline-flex">
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              {recent.length ? (
                <div className="divide-y divide-[#f0f1f2]">
                  {recent.map((record) => (
                    <Link key={record.id} href={`/add-record?edit=${record.id}`} className="grid gap-1 px-5 py-4 transition-colors hover:bg-[#f9fbfc] sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-6">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#131416]">{record.factoryName}</p>
                        <p className="mt-1 truncate text-sm text-[#5d5f60]">{record.location} · {record.supervisedBy}</p>
                      </div>
                      <p className="text-sm text-[#5d5f60]">{record.dateStr} · {record.shift}</p>
                      <p className="text-right text-sm font-medium tabular-nums text-[#131416]">{record.personsCount} people</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-12 text-center">
                  <Users className="mx-auto h-5 w-5 text-[#5d5f60]" />
                  <p className="mt-3 text-sm font-medium text-[#131416]">No shifts logged yet</p>
                  <p className="mt-1 text-sm text-[#5d5f60]">Your latest entries will appear here.</p>
                </div>
              )}
            </div>

            <aside className="rounded-lg bg-[#f4f6f8] p-5">
              <FileSpreadsheet className="h-5 w-5 text-[#1b6c80]" />
              <h2 className="mt-5 text-base font-semibold text-[#131416]">Records source</h2>
              <p className="mt-2 text-sm leading-6 text-[#5d5f60]">
                {sync.spreadsheetName || "ShiftLog Records"} is {sync.syncStatus || "ready"} for Google Sheets sync.
              </p>
              <Link href="/settings" className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[#1b6c80] hover:text-[#135464]">
                Manage connection <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-8 border-t border-[#e0e4e5] pt-4 text-xs text-[#5d5f60]">Signed in as {user?.name || user?.email || "…"}</p>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}
