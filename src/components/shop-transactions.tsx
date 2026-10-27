"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  copy,
  dateText,
  isInflow,
  isOutflow,
  methodLabel,
  methods,
  money,
  ShopMethod,
} from "@/lib/shop";
import { useShopLanguage } from "@/components/shop-language";
import { ShopPdfExport } from "@/components/shop-pdf-export";
type Row = {
  id: string;
  dateStr: string;
  enteredBy: string;
  method: ShopMethod;
  partyName: string;
  productName?: string;
  amountPaisa: number;
};
export function ShopTransactions() {
  const { language } = useShopLanguage();
  const t = copy(language);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    date: "",
    startDate: "",
    endDate: "",
    method: "all",
    party: "",
    product: "",
  });
  const limit = 50;
  useEffect(() => {
    const params = new URLSearchParams({
      ...filters,
      limit: String(limit),
      offset: String((page - 1) * limit),
    });
    fetch(`/api/shop/transactions?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setRows(data.transactions || []);
        setTotal(data.total || 0);
      })
      .catch(() => {});
  }, [filters, page]);
  const update = (key: keyof typeof filters, value: string) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const exportQuery = new URLSearchParams({ ...filters });
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t.history}</h1>
          <p className="mt-1 text-sm text-[#6b6b6b]">
            {total} {t.records}
          </p>
        </div>
        <div className="flex gap-2"><ShopPdfExport query={exportQuery} language={language} /><Link href="/add-transaction" className="h-10 rounded-md bg-[#141414] px-4 py-2.5 text-sm font-medium text-white">{t.add}</Link></div>
      </div>
      <section className="grid gap-3 rounded-lg border border-[#e6e6e6] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="date"
          aria-label={t.date}
          value={filters.date}
          onChange={(e) => update("date", e.target.value)}
          className="h-9 rounded-md border border-[#d4d4d4] px-2 text-sm"
        />
        <select
          value={filters.method}
          onChange={(e) => update("method", e.target.value)}
          className="h-9 rounded-md border border-[#d4d4d4] px-2 text-sm"
        >
          <option value="all">{t.allMethods}</option>
          {methods.map((method) => (
            <option key={method} value={method}>
              {methodLabel(method, language)}
            </option>
          ))}
        </select>
        <input
          value={filters.party}
          onChange={(e) => update("party", e.target.value)}
          placeholder={t.party}
          className="h-9 rounded-md border border-[#d4d4d4] px-2 text-sm"
        />
        <input
          value={filters.product}
          onChange={(e) => update("product", e.target.value)}
          placeholder={t.product}
          className="h-9 rounded-md border border-[#d4d4d4] px-2 text-sm"
        />
        <input
          type="date"
          aria-label={t.startDate}
          value={filters.startDate}
          onChange={(e) => update("startDate", e.target.value)}
          className="h-9 rounded-md border border-[#d4d4d4] px-2 text-sm"
        />
        <input
          type="date"
          aria-label={t.endDate}
          value={filters.endDate}
          onChange={(e) => update("endDate", e.target.value)}
          className="h-9 rounded-md border border-[#d4d4d4] px-2 text-sm"
        />
        <button
          onClick={() => {
            setFilters({
              date: "",
              startDate: "",
              endDate: "",
              method: "all",
              party: "",
              product: "",
            });
            setPage(1);
          }}
          className="h-9 rounded-md border border-[#d4d4d4] text-sm"
        >
          {t.clear}
        </button>
      </section>
      <section className="overflow-hidden rounded-lg border border-[#e6e6e6] bg-white">
        <div className="hidden grid-cols-[120px_1fr_1fr_140px] gap-4 px-5 py-3 text-xs text-[#6b6b6b] md:grid">
          <span>{t.date}</span>
          <span>{t.party}</span>
          <span>{t.method}</span>
          <span className="text-right">{t.amount}</span>
        </div>
        {rows.length ? (
          rows.map((row) => (
            <Link
              key={row.id}
              href={`/contact?party=${encodeURIComponent(row.partyName)}`}
              className="grid gap-1 border-t border-[#f0f0f0] px-5 py-3 text-sm md:grid-cols-[120px_1fr_1fr_140px] md:items-center md:gap-4"
            >
              <span className="text-[#6b6b6b]">
                {dateText(row.dateStr, language)}
              </span>
              <span className="font-medium">{row.partyName}</span>
              <span className="text-[#6b6b6b]">
                {methodLabel(row.method, language)}
                {row.productName ? ` · ${row.productName}` : ""}
              </span>
              <span
                className={`text-right font-medium tabular-nums ${isInflow(row.method) ? "text-[#247b50]" : isOutflow(row.method) ? "text-[#c4242a]" : "text-[#0a0a0a]"}`}
              >
                {isInflow(row.method) ? "+" : isOutflow(row.method) ? "−" : ""}
                {money(row.amountPaisa, language)}
              </span>
            </Link>
          ))
        ) : (
          <p className="px-5 py-12 text-sm text-[#6b6b6b]">{t.noRows}</p>
        )}
      </section>
      {total > limit && (
        <div className="flex items-center justify-between">
          <button
            disabled={page === 1}
            onClick={() => setPage((current) => current - 1)}
            className="h-9 rounded-md border border-[#d4d4d4] px-3 text-sm disabled:opacity-40"
          >
            {t.previous}
          </button>
          <span className="text-sm text-[#6b6b6b]">
            {t.page} {page}
          </span>
          <button
            disabled={page * limit >= total}
            onClick={() => setPage((current) => current + 1)}
            className="h-9 rounded-md border border-[#d4d4d4] px-3 text-sm disabled:opacity-40"
          >
            {t.next}
          </button>
        </div>
      )}
    </div>
  );
}
