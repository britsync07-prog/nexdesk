"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { FilterBar, FilterState } from "@/components/filter-bar";
import { RecordCard, RecordItem } from "@/components/record-card";
import { PDFExportButton } from "@/components/pdf-export-button";
import { PDFCustomColumnDef } from "@/lib/pdf";
import { ChevronLeft, ChevronRight, Loader2, FileSpreadsheet, PlusCircle } from "lucide-react";
import Link from "next/link";

const PAGE_SIZE = 50;

export default function HistoryPage() {
  const router = useRouter();
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [customColumns, setCustomColumns] = useState<PDFCustomColumnDef[]>([]);

  const [filters, setFilters] = useState<FilterState>({
    date: "",
    startDate: "",
    endDate: "",
    shift: "all",
    factoryName: "",
    supervisedBy: "",
    location: "",
    personName: "",
  });

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.date) params.set("date", filters.date);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      if (filters.shift && filters.shift !== "all") params.set("shift", filters.shift);
      if (filters.factoryName) params.set("factoryName", filters.factoryName);
      if (filters.supervisedBy) params.set("supervisedBy", filters.supervisedBy);
      if (filters.location) params.set("location", filters.location);
      if (filters.personName) params.set("personName", filters.personName);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String((page - 1) * PAGE_SIZE));

      const res = await fetch(`/api/records?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setTotalCount(data.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => {
        if (!data.user) router.replace("/login");
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  // Load custom column headers for PDF export
  useEffect(() => {
    fetch("/api/custom-columns")
      .then((res) => res.json())
      .then((data) => {
        if (data.columns) {
          setCustomColumns(
            data.columns.map((c: { key: string; name: string }) => ({
              key: c.key,
              name: c.name,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleClearFilters = () => {
    setPage(1);
    setFilters({
      date: "",
      startDate: "",
      endDate: "",
      shift: "all",
      factoryName: "",
      supervisedBy: "",
      location: "",
      personName: "",
    });
  };

  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (next.length === 0 && page > 1) setPage(page - 1);
      return next;
    });
    setTotalCount((prev) => Math.max(0, prev - 1));
  };

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Convert RecordItem to PDFExportRecord
  const pdfRecords = records.map((r) => ({
    id: r.id,
    dateStr: r.dateStr,
    shift: r.shift,
    supervisedBy: r.supervisedBy,
    factoryName: r.factoryName,
    location: r.location,
    personsCount: r.personsCount,
    personNames: r.persons?.map((p) => p.name) || [],
    remarks: r.remarks,
    customValues: r.customValues ? JSON.parse(r.customValues) : {},
  }));

  return (
    <div className="nex-app min-h-screen bg-[#e4eae6] p-2 md:pl-[236px]">
      <Header />

      <div className="mx-auto min-h-[calc(100svh-1rem)] max-w-6xl rounded-[16px] border border-[#e8eaec] bg-white px-4 py-6 space-y-6 md:px-8">
        {/* Page Title & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-[#131416] tracking-tight">
              Shift Records History
            </h1>
            <p className="text-xs text-zinc-400">
              Filter records by date, supervisor, worker name, or location, and export filtered reports.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <PDFExportButton
              records={pdfRecords}
              filterSummary={{
                date: filters.date,
                startDate: filters.startDate,
                endDate: filters.endDate,
                shift: filters.shift,
                factoryName: filters.factoryName,
                supervisedBy: filters.supervisedBy,
                location: filters.location,
                personName: filters.personName,
                totalRecords: records.length,
              }}
              customColumns={customColumns}
            />

            <Link
              href="/add-record"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 active:scale-95 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Record</span>
            </Link>
          </div>
        </div>

        {/* Filter Bar Component */}
        <div className="p-4 rounded-2xl bg-[#121215] border border-zinc-800">
          <FilterBar
            filters={filters}
            onChange={(nextFilters) => { setPage(1); setFilters(nextFilters); }}
            onClear={handleClearFilters}
            resultCount={totalCount}
          />
        </div>

        {/* Records List Feed */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-xs font-mono">Loading records from database...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 rounded-3xl bg-[#121215] border border-zinc-800 text-center space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-zinc-200">No matching shift records</h3>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-1">
                Try adjusting or clearing your active filters to see more results, or add a new record.
              </p>
            </div>
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 text-zinc-200 font-semibold text-xs border border-zinc-700"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <RecordCard key={record.id} record={record} onDelete={handleDeleteRecord} />
            ))}
          </div>
        )}

        {totalCount > PAGE_SIZE && !isLoading && (
          <nav className="flex items-center justify-between border-t border-[#e8eaec] pt-4" aria-label="History pages">
            <button type="button" onClick={() => setPage((current) => current - 1)} disabled={page === 1} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d6dbd8] px-3 text-sm font-medium text-[#131416] disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Previous</button>
            <p className="text-sm text-[#5d5f60]">Page {page} of {pageCount} · {totalCount} records</p>
            <button type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= pageCount} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d6dbd8] px-3 text-sm font-medium text-[#131416] disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight className="h-4 w-4" /></button>
          </nav>
        )}
      </div>
    </div>
  );
}
