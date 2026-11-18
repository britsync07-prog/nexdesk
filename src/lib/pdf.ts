import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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

export const DEFAULT_WORKER_ROSTER: string[] = [
  "Tuhin",
  "Rahim",
  "Karim",
  "Jamal",
  "Fatima",
  "Tariq",
  "Hasan",
  "Tuhel",
  "Alamin",
  "Sajib",
  "Rony",
  "Sumon",
  "Biplob",
  "Shakil",
  "Arif",
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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("NexDesk shift records", 14, 12);

  // Subtitle / generated timestamp
  const nowStr = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Generated: ${nowStr} | Total records: ${filterSummary.totalRecords}`, 14, 18);

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

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(criteriaText, 14, 24);

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

  // --- Main Shift Records Table (Margin right: 60mm leaves room for side table) ---
  autoTable(doc, {
    startY: 30,
    head: [[
      "#", "Date", "Factory", "Location", "Personnel",
      filterSummary.personName ? "Employee" : "Personnel Names",
      "Remarks",
      ...customColumns.map((col) => col.name),
    ]],
    body: tableData,
    theme: "grid",
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      overflow: "linebreak",
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "left",
      overflow: "linebreak",
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 20 },
      2: { cellWidth: 30 },
      3: { cellWidth: 26 },
      4: { cellWidth: 16, halign: "center" },
      5: { cellWidth: filterSummary.personName ? 32 : 48 },
    },
    margin: { left: 14, right: 60, bottom: 18 },
  });

  // --- Worker Attendance Side Table ---
  // Determine full roster (user-supplied custom roster or hardcoded default)
  const roster = (customRoster && customRoster.length > 0)
    ? customRoster
    : DEFAULT_WORKER_ROSTER;

  // Extract all present worker names from the records
  const presentNormalized = new Set<string>();
  records.forEach((record) => {
    (record.personNames || []).forEach((name) => {
      if (name && typeof name === "string") {
        const trimmed = name.trim().toLowerCase();
        if (trimmed) presentNormalized.add(trimmed);
      }
    });
  });

  const isWorkerPresent = (workerName: string): boolean => {
    const clean = workerName.trim().toLowerCase();
    if (presentNormalized.has(clean)) return true;
    for (const p of presentNormalized) {
      if (p && (p.includes(clean) || clean.includes(p))) return true;
    }
    return false;
  };

  const attendanceData = roster.map((worker) => {
    const present = isWorkerPresent(worker);
    return [worker, present ? "Present" : "Absent"];
  });

  const presentCount = roster.filter(isWorkerPresent).length;

  // Switch to Page 1 to place the side table alongside the main table
  doc.setPage(1);

  autoTable(doc, {
    startY: 30,
    head: [[
      `Worker Roster (${presentCount}/${roster.length})`,
      "Status",
    ]],
    body: attendanceData,
    theme: "grid",
    styles: {
      fontSize: 6.5,
      cellPadding: 1.2,
      overflow: "linebreak",
      lineColor: [0, 0, 0],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.8,
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: 27 },
      1: { cellWidth: 15, halign: "center" },
    },
    margin: { left: 241, right: 14, bottom: 18 },
    tableWidth: 42,
    didParseCell: (data) => {
      if (data.section === "body") {
        const worker = roster[data.row.index];
        const present = isWorkerPresent(worker);
        if (present) {
          // Green: Worked on shift / present in main table
          data.cell.styles.textColor = [22, 101, 52];     // Dark green text
          data.cell.styles.fillColor = [240, 253, 244];   // Soft green background
          data.cell.styles.fontStyle = "bold";
        } else {
          // Red: Did not work on shift / absent from main table
          data.cell.styles.textColor = [185, 28, 28];     // Dark red text
          data.cell.styles.fillColor = [254, 242, 242];   // Soft red background
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  // --- Multi-page Footer Page Numbering ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    const footerText = `NexDesk | Page ${p} of ${totalPages}`;
    doc.text(footerText, pageWidth / 2, pageHeight - 8, { align: "center" });
  }

  return doc;
}
