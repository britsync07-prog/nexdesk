"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ShopLanguage } from "@/lib/shop";

const Context = createContext<{ language: ShopLanguage; setLanguage: (language: ShopLanguage) => void }>({ language: "en", setLanguage: () => {} });

export function ShopLanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<ShopLanguage>("en");
  useEffect(() => { setLanguageState(localStorage.getItem("shop-language") === "bn" ? "bn" : "en"); }, []);
  const setLanguage = (next: ShopLanguage) => { localStorage.setItem("shop-language", next); setLanguageState(next); };
  return <Context.Provider value={{ language, setLanguage }}>{children}</Context.Provider>;
}

export const useShopLanguage = () => useContext(Context);
