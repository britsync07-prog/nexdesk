"use client";
import { useEffect, useState } from "react";
import { useShopLanguage } from "@/components/shop-language";

export function ShopSheetLink() {
  const { language } = useShopLanguage(); const bn = language === "bn";
  const [link, setLink] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/shop/sheet", { method: "POST" }).then((response) => response.json()).then((data) => setLink(data.webViewLink || null)).catch(() => {}).finally(() => setLoading(false)); }, []);
  return <section className="mt-6 rounded-lg border border-[#e6e6e6] bg-white p-5"><h2 className="font-medium">{bn ? "গুগল শিটস" : "Google Sheets"}</h2><p className="mt-1 text-sm text-[#6b6b6b]">{bn ? "দোকানের লেনদেনের আলাদা শিট।" : "A separate sheet for your shop transactions."}</p>{loading ? <p className="mt-4 text-sm text-[#6b6b6b]">{bn ? "শিট তৈরি হচ্ছে…" : "Preparing shop sheet…"}</p> : link ? <a href={link} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-10 items-center rounded-md bg-[#141414] px-4 text-sm font-medium text-white">{bn ? "শিট খুলুন" : "Open shop sheet"}</a> : <p className="mt-4 text-sm text-[#c4242a]">{bn ? "শিট তৈরি করা যায়নি।" : "Could not create the shop sheet."}</p>}</section>;
}
