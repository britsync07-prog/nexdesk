"use client";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { copy, methodLabel, money, ShopLanguage, ShopMethod } from "@/lib/shop";

type Row = { dateStr: string; enteredBy: string; method: ShopMethod; partyName: string; productName?: string; quantityMilli?: number; unitPricePaisa?: number; amountPaisa: number; note?: string };

export function ShopPdfExport({ query, language }: { query: URLSearchParams; language: ShopLanguage }) {
  const t = copy(language);
  const exportPdf = async () => {
    query.set("export", "pdf");
    query.set("limit", "5000");
    const data = await fetch(`/api/shop/transactions?${query}`).then((response) => response.json());
    const rows = (data.transactions || []) as Row[];
    const pdf = new jsPDF({ orientation: "landscape" });
    pdf.setFontSize(14);
    pdf.text(language === "bn" ? "দোকান খাতা" : "Shop ledger", 14, 15);
    autoTable(pdf, {
      startY: 21,
      head: [[t.date, t.enteredBy, t.method, t.party, t.product, t.quantity, t.unitPrice, t.amount, t.note]],
      body: rows.map((row) => [row.dateStr, row.enteredBy, methodLabel(row.method, language), row.partyName, row.productName || "", row.quantityMilli ? String(row.quantityMilli / 1000) : "", row.unitPricePaisa ? money(row.unitPricePaisa, language) : "", money(row.amountPaisa, language), row.note || ""]),
      styles: { fontSize: 7, cellPadding: 2, textColor: 0, lineColor: 0, lineWidth: 0.1 },
      headStyles: { fillColor: 255, textColor: 0, lineColor: 0, lineWidth: 0.2, fontStyle: "bold" },
      theme: "grid",
    });
    pdf.save("shop-ledger.pdf");
  };
  return <button onClick={exportPdf} className="h-10 rounded-md border border-[#d4d4d4] px-4 text-sm font-medium">{t.pdf}</button>;
}
