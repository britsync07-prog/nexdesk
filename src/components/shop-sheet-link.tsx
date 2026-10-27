"use client";
import { useEffect, useState } from "react";
import { useShopLanguage } from "@/components/shop-language";

export function ShopSheetLink() {
  const { language } = useShopLanguage(); const bn = language === "bn";
  const [link, setLink] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  useEffect(() => { fetch("/api/shop/sheet").then((response) => response.json()).then((data) => setLink(data.webViewLink || null)).catch(() => {}); }, []);
  async function create() { setLoading(true); const data = await fetch("/api/shop/sheet", { method: "POST" }).then((response) => response.json()); setLink(data.webViewLink || null); setLoading(false); }
  return <section className="mt-6 rounded-lg border border-[#e6e6e6] bg-white p-5"><h2 className="font-medium">{bn ? "গুগল শিটস" : "Google Sheets"}</h2><p className="mt-1 text-sm text-[#6b6b6b]">{bn ? "দোকানের লেনদেনের আলাদা শিট।" : "A separate sheet for your shop transactions."}</p>{link ? <a href={link} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-10 items-center rounded-md bg-[#141414] px-4 text-sm font-medium text-white">{bn ? "শিট খুলুন" : "Open shop sheet"}</a> : <button onClick={create} disabled={loading} className="mt-4 h-10 rounded-md bg-[#141414] px-4 text-sm font-medium text-white disabled:opacity-50">{loading ? (bn ? "তৈরি হচ্ছে…" : "Creating…") : (bn ? "শিট তৈরি করুন" : "Create shop sheet")}</button>}</section>;
}
