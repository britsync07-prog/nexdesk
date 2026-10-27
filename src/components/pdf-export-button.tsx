"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { generateShiftLogPDF, PDFExportRecord, PDFExportFilterSummary, PDFCustomColumnDef } from "@/lib/pdf";

interface PDFExportButtonProps {
  records: PDFExportRecord[];
  filterSummary: PDFExportFilterSummary;
  customColumns?: PDFCustomColumnDef[];
}

export function PDFExportButton({
  records,
  filterSummary,
  customColumns = [],
}: PDFExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (records.length === 0) {
      alert("No records match the active filters to export.");
      return;
    }

    setIsExporting(true);
    try {
      // Yield to main thread so loading spinner renders
      await new Promise((r) => setTimeout(r, 50));

      const doc = generateShiftLogPDF(records, filterSummary, customColumns);
      const filenameDate =
        filterSummary.startDate && filterSummary.endDate
          ? `${filterSummary.startDate}_to_${filterSummary.endDate}`
          : filterSummary.date || new Date().toISOString().split("T")[0];

      doc.save(`ShiftLog_Report_${filenameDate}.pdf`);
    } catch (err: unknown) {
      alert("Failed to generate PDF: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isExporting || records.length === 0}
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold border border-zinc-700/80 active:scale-95 transition-all shadow-sm disabled:opacity-40 disabled:pointer-events-none"
    >
      {isExporting ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
          <span>Generating PDF...</span>
        </>
      ) : (
        <>
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span>Export Filtered PDF</span>
        </>
      )}
    </button>
  );
}
