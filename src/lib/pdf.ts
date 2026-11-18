import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { WORKERS_BY_LOCATION } from "./workforce";

export interface PDFExportRecord {
  id: string;
  dateStr: string;
  shift?: string;
  supervisedBy?: string;
  factoryName: string;
  location: string;
  personsCount: number;
  remarks?: string | null;
  personNames: string[];
  employeeNote?: string;
  customValues?: Record<string, string>;
}

export interface PDFExportFilterSummary {
  date?: string;
  startDate?: string;
  endDate?: string;
  shift?: string;
  supervisedBy?: string;
  factoryName?: string;
  location?: string;
  personName?: string;
  totalRecords: number;
}

export interface PDFCustomColumnDef {
  key: string;
  name: string;
}

export interface AutoTableCellHookData {
  section: string;
  row: { index: number };
  cell: {
    styles: {
      textColor?: number[] | string;
      fillColor?: number[] | string | boolean;
      fontStyle?: string;
    };
  };
}

// All hardcoded workers defined across the system (Mirpur, Narshinghpur, and designated personnel)
export const DEFAULT_WORKER_ROSTER: string[] = [
  ...WORKERS_BY_LOCATION.Mirpur,
  ...WORKERS_BY_LOCATION.Narshinghpur,
  "Hajira",
];

export function generateShiftLogPDF(
  records: PDFExportRecord[],
  filterSummary: PDFExportFilterSummary,
  customColumns: PDFCustomColumnDef[] = [],
  customRoster?: string[]
): jsPDF {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Document Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(17, 24, 39);
  doc.text("NexDesk Shift Records & Workforce Daily Attendance", 14, 12);

  // Subtitle / generated timestamp
  const nowStr = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${nowStr} | Total Records: ${filterSummary.totalRecords}`, 14, 18);

  const filterTags: string[] = [];
  if (filterSummary.startDate && filterSummary.endDate) {
    filterTags.push(`Range: ${filterSummary.startDate} to ${filterSummary.endDate}`);
  } else if (filterSummary.date) {
    filterTags.push(`Date: ${filterSummary.date}`);
  }
  if (filterSummary.shift && filterSummary.shift !== "all") filterTags.push(`Shift: ${filterSummary.shift}`);
  if (filterSummary.factoryName) filterTags.push(`Factory: ${filterSummary.factoryName}`);
  if (filterSummary.supervisedBy) filterTags.push(`Supervisor: ${filterSummary.supervisedBy}`);
  if (filterSummary.location) filterTags.push(`Location: ${filterSummary.location}`);
  if (filterSummary.personName) filterTags.push(`Personnel: ${filterSummary.personName}`);

  const criteriaText = filterTags.length > 0 ? filterTags.join("  |  ") : "All Historical Records (No filters applied)";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Filter Criteria: ${criteriaText}`, 14, 24);

  // --- Table Headers & Data Assembly ---
  const tableData = records.map((record, index) => {
    const customCells = customColumns.map((col) => {
      const val = record.customValues?.[col.key];
      return val !== undefined && val !== null ? String(val) : "";
    });
    const formattedNames =
      record.personNames && record.personNames.length > 0
        ? record.personNames.filter(Boolean).join(" + ")
        : "-";
    return [
      String(index + 1),
      record.dateStr,
      record.factoryName,
      record.location,
      String(record.personsCount),
      formattedNames,
      record.remarks || "",
      ...customCells,
    ];
  });

  // --- Main Shift Records Table (Margin right: 61mm leaves room for side table) ---
  autoTable(doc, {
    startY: 28,
    head: [[
      "#", "Date", "Factory", "Location", "Persons",
      filterSummary.personName ? "Employee" : "Personnel Names (On Duty)",
      "Remarks",
      ...customColumns.map((col) => col.name),
    ]],
    body: tableData,
    theme: "grid",
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      overflow: "linebreak",
      textColor: [17, 24, 39],
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "left",
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 20 },
      2: { cellWidth: 36 },
      3: { cellWidth: 26 },
      4: { cellWidth: 16, halign: "center" },
      5: { cellWidth: filterSummary.personName ? 34 : 56 },
    },
    margin: { left: 14, right: 61, bottom: 18 },
  });

  // --- Worker Attendance Side Table ---
  // Ensure all hardcoded workers are included, plus custom roster names if provided
  const baseRoster = (customRoster && customRoster.length > 0)
    ? customRoster
    : DEFAULT_WORKER_ROSTER;
  const rosterSet = new Set(baseRoster);
  DEFAULT_WORKER_ROSTER.forEach((name) => rosterSet.add(name));
  const roster = Array.from(rosterSet);

  // Extract all present worker names from the records
  const presentNormalized = new Set<string>();
  records.forEach((record) => {
    (record.personNames || []).forEach((raw) => {
      if (raw && typeof raw === "string") {
        const parts = raw.split(/[,+&/\n]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
        for (const p of parts) presentNormalized.add(p);
        const trimmed = raw.trim().toLowerCase();
        if (trimmed) presentNormalized.add(trimmed);
      }
    });
  });

  const isWorkerPresent = (workerName: string): boolean => {
    const clean = workerName.trim().toLowerCase();
    if (!clean) return false;
    if (presentNormalized.has(clean)) return true;
    for (const p of presentNormalized) {
      if (p === clean || p.includes(clean) || clean.includes(p)) return true;
    }
    return false;
  };

  const attendanceData = roster.map((worker) => {
    const present = isWorkerPresent(worker);
    return [worker, present ? "Present" : "Absent"];
  });

  const presentCount = roster.filter(isWorkerPresent).length;
  const absentCount = roster.length - presentCount;

  // Switch to Page 1 to place the side table alongside the main table
  doc.setPage(1);

  autoTable(doc, {
    startY: 28,
    head: [[
      `Worker (${presentCount}/${roster.length})`,
      "Status",
    ]],
    body: attendanceData,
    theme: "grid",
    styles: {
      fontSize: 6.8,
      cellPadding: 1.3,
      overflow: "linebreak",
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 16, halign: "center" },
    },
    margin: { left: 239, right: 14, bottom: 18 },
    tableWidth: 44,
    didParseCell: (data: AutoTableCellHookData) => {
      if (data.section === "body") {
        const worker = roster[data.row.index];
        const present = isWorkerPresent(worker);
        if (present) {
          // GREEN: Worker went to job that day / present in main table
          data.cell.styles.textColor = [21, 128, 61];     // Strong Green (#15803d)
          data.cell.styles.fillColor = [240, 253, 244];   // Soft Light Green (#f0fdf4)
          data.cell.styles.fontStyle = "bold";
        } else {
          // RED: Worker did NOT go to job / absent from main table
          data.cell.styles.textColor = [185, 28, 28];     // Strong Red (#b91c1c)
          data.cell.styles.fillColor = [254, 242, 242];   // Soft Light Red (#fef2f2)
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  // Summary footer row right below the side table
  const sideTableFinalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(21, 128, 61);
  doc.text(`On Duty: ${presentCount}`, 239, sideTableFinalY + 4);
  doc.setTextColor(185, 28, 28);
  doc.text(`Absent: ${absentCount}`, 264, sideTableFinalY + 4);

  // --- Multi-page Footer Page Numbering ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const footerText = `NexDesk ShiftLog Management System | Page ${p} of ${totalPages}`;
    doc.text(footerText, pageWidth / 2, pageHeight - 8, { align: "center" });
  }

  return doc;
}
