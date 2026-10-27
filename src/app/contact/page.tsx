"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { copy, dateText, methodLabel, money, ShopMethod } from "@/lib/shop";
import { useShopLanguage } from "@/components/shop-language";

type Detail = { partyName: string; balance: { receivablePaisa: number; payablePaisa: number }; transactions: { id: string; dateStr: string; method: ShopMethod; productName?: string; amountPaisa: number; note?: string }[] };

export default function ContactDetailPage() {
  return <Suspense fallback={null}><ContactDetail /></Suspense>;
}

function ContactDetail() {
  const { language } = useShopLanguage();
  const t = copy(language);
  const party = useSearchParams().get("party") || "";
  const [data, setData] = useState<Detail | null>(null);
  useEffect(() => { if (party) fetch(`/api/shop/contacts/${encodeURIComponent(party)}`).then((res) => res.json()).then(setData).catch(() => {}); }, [party]);
  if (!data) return <main className="p-8 text-sm text-[#6b6b6b]">{t.loading}</main>;
  return <main className="mx-auto max-w-5xl space-y-5 p-5 md:p-8"><Link href="/contacts" className="text-sm text-[#1d5fbf]">← {t.people}</Link><div><h1 className="text-2xl font-semibold">{data.partyName}</h1><p className="mt-1 text-sm text-[#6b6b6b]">{t.customerHistory}</p></div><section className="grid overflow-hidden rounded-lg border border-[#e6e6e6] bg-white sm:grid-cols-2"><div className="border-b border-[#e6e6e6] p-5 sm:border-b-0 sm:border-r"><p className="text-sm text-[#6b6b6b]">{t.theyOwe}</p><p className="mt-2 text-2xl font-semibold text-[#247b50]">{money(data.balance.receivablePaisa, language)}</p></div><div className="p-5"><p className="text-sm text-[#6b6b6b]">{t.youOwe}</p><p className="mt-2 text-2xl font-semibold text-[#c4242a]">{money(data.balance.payablePaisa, language)}</p></div></section><section className="overflow-hidden rounded-lg border border-[#e6e6e6] bg-white">{data.transactions.map((row) => <div key={row.id} className="grid gap-1 border-b border-[#f0f0f0] px-5 py-3 text-sm sm:grid-cols-[130px_1fr_auto]"><span className="text-[#6b6b6b]">{dateText(row.dateStr, language)}</span><span>{methodLabel(row.method, language)}{row.productName ? ` · ${row.productName}` : ""}{row.note ? <small className="block text-[#6b6b6b]">{row.note}</small> : null}</span><span className="font-medium tabular-nums">{money(row.amountPaisa, language)}</span></div>)}</section></main>;
}
