"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => setDark(document.documentElement.classList.contains("theme-dark")), []);

  function toggleTheme() {
    const next = !dark;
    document.documentElement.classList.toggle("theme-dark", next);
    localStorage.setItem("nexdesk-theme", next ? "dark" : "light");
    setDark(next);
  }

  return <button type="button" onClick={toggleTheme} className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm text-[#5d5f60] transition-colors hover:bg-white hover:text-[#131416]" aria-label={`Switch to ${dark ? "light" : "dark"} mode`} title={`Switch to ${dark ? "light" : "dark"} mode`}>{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}<span>{dark ? "Light mode" : "Dark mode"}</span></button>;
}
