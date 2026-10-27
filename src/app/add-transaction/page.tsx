"use client";
import { ShopTransactionForm } from "@/components/shop-transaction-form";
import { useShopLanguage } from "@/components/shop-language";
import { copy } from "@/lib/shop";
export default function AddTransactionPage() { const { language } = useShopLanguage(); const t = copy(language); return <main className="mx-auto max-w-3xl p-5 md:p-8"><h1 className="text-2xl font-semibold">{t.add}</h1><p className="mt-2 text-sm text-[#6b6b6b]">{language === "bn" ? "প্রতিটি লেনদেনের প্রভাব সঙ্গে সঙ্গে দেখা যাবে।" : "Each transaction updates cash, due, and debt immediately."}</p><div className="mt-6 rounded-lg border border-[#e6e6e6] bg-white p-5 sm:p-7"><ShopTransactionForm /></div></main>; }
