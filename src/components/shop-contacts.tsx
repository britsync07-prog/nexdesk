"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { copy, money } from "@/lib/shop";
import { useShopLanguage } from "@/components/shop-language";
type Contact = {
  partyName: string;
  receivablePaisa: number;
  payablePaisa: number;
};
export function ShopContacts() {
  const { language } = useShopLanguage();
  const t = copy(language);
  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  useEffect(() => {
    const timer = setTimeout(
      () =>
        fetch(`/api/shop/contacts?query=${encodeURIComponent(query)}`)
          .then((res) => res.json())
          .then((data) => { setContacts(data.contacts || []); if (!query) localStorage.setItem("shop-khata-contacts", JSON.stringify(data.contacts || [])); })
          .catch(() => { if (!query) { const cached = localStorage.getItem("shop-khata-contacts"); if (cached) setContacts(JSON.parse(cached)); } }),
      160,
    );
    return () => clearTimeout(timer);
  }, [query]);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">{t.people}</h1>
        <p className="mt-1 text-sm text-[#6b6b6b]">{t.customerHistory}</p>
      </div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t.contactSearch}
        className="h-10 w-full max-w-md rounded-md border border-[#d4d4d4] bg-white px-3 text-sm"
      />
      <section className="overflow-hidden rounded-lg border border-[#e6e6e6] bg-white">
        {contacts.length ? (
          contacts.map((contact) => (
            <Link
              key={contact.partyName}
            href={`/contact?party=${encodeURIComponent(contact.partyName)}`}
              className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#f0f0f0] px-5 py-4 last:border-b-0"
            >
              <span className="font-medium">{contact.partyName}</span>
              <span className="text-right text-sm">
                <span className="block text-[#247b50]">
                  {t.theyOwe}: {money(contact.receivablePaisa, language)}
                </span>
                <span className="mt-1 block text-[#c4242a]">
                  {t.youOwe}: {money(contact.payablePaisa, language)}
                </span>
              </span>
            </Link>
          ))
        ) : (
          <p className="px-5 py-12 text-sm text-[#6b6b6b]">{t.noOutstanding}</p>
        )}
      </section>
    </div>
  );
}
