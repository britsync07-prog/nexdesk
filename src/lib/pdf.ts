import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface PDFExportRecord {
  id: string;
  dateStr: string;
  factoryName: string;
  location: string;
  personsCount: number;
  remarks?: string | null;
  personNames: string[];
  customValues?: Record<string, string>;
}

export interface PDFExportFilterSummary {
  date?: string;
  startDate?: string;
  endDate?: string;
  factoryName?: string;
  location?: string;
  personName?: string;
  totalRecords: number;
}

export interface PDFCustomColumnDef {
  key: string;
  name: string;
}

export function generateShiftLogPDF(
  records: PDFExportRecord[],
  filterSummary: PDFExportFilterSummary,
  customColumns: PDFCustomColumnDef[] = []
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
  if (filterSummary.factoryName) filterTags.push(`Factory: ${filterSummary.factoryName}`);
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

  // --- AutoTable Layout ---
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
      2: { cellWidth: 32 },
      3: { cellWidth: 28 },
      4: { cellWidth: 18, halign: "center" },
      5: { cellWidth: filterSummary.personName ? 36 : 56 },
    },
    margin: { left: 14, right: 14, bottom: 18 },
    didDrawPage: () => {
      // Footer page numbering
      const totalPages = doc.getNumberOfPages();
      const currentPage = (doc as unknown as { internal: { getCurrentPageInfo: () => { pageNumber: number } } }).internal.getCurrentPageInfo().pageNumber;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      const footerText = `NexDesk | Page ${currentPage} of ${totalPages}`;
      doc.text(footerText, pageWidth / 2, pageHeight - 8, { align: "center" });
    },
  });

  return doc;
}
