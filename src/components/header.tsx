"use client";

import Link from "next/link";
import { Cloud, CloudOff, RefreshCw, Smartphone } from "lucide-react";
import { useState, useEffect } from "react";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";

interface HeaderProps {
  onOpenInstallGuide?: () => void;
}

export function Header({ onOpenInstallGuide }: HeaderProps) {
  const [syncStatus, setSyncStatus] = useState<string>("idle");
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchSyncStatus();
    const interval = setInterval(fetchSyncStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  async function fetchSyncStatus() {
    try {
      const res = await fetch("/api/sync");
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data.syncStatus || "idle");
        setLastSyncAt(data.lastSyncAt);
      }
    } catch {
      // ignore
    }
  }

  async function triggerManualSync() {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_all" }),
      });
      if (res.ok) {
        await fetchSyncStatus();
      }
    } catch {
      // ignore
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="sticky top-0 z-30 -mx-5 mb-6 flex items-center justify-between border-b border-[#e8eaec] bg-white px-5 py-3 sm:-mx-8 sm:px-8 md:hidden">
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <BrandMark className="w-7 h-7 text-[#1b6c80]" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight tracking-[-0.03em] text-[#131416]">NexDesk</span>
          <span className="text-xs text-[#5d5f60]">Factory operations</span>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        {onOpenInstallGuide && (
          <button
            onClick={onOpenInstallGuide}
            className="rounded-md p-1.5 text-[#5d5f60] hover:bg-[#f4f6f8] hover:text-[#131416]"
            title="Install App"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={triggerManualSync}
          disabled={isSyncing}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors ${
            syncStatus === "synced"
              ? "bg-[#e5f4eb] text-[#1e7b4f]"
              : syncStatus === "error"
              ? "bg-[#fbe8e8] text-[#c4242a]"
              : "bg-[#f4f6f8] text-[#5d5f60]"
          }`}
          title={lastSyncAt ? `Last synced: ${new Date(lastSyncAt).toLocaleTimeString()}` : "Sync with Google Sheets"}
        >
          {isSyncing ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#1b6c80]" />
          ) : syncStatus === "synced" ? (
            <Cloud className="h-3.5 w-3.5 text-[#1e7b4f]" />
          ) : syncStatus === "error" ? (
            <CloudOff className="h-3.5 w-3.5 text-[#c4242a]" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 text-[#5d5f60]" />
          )}
          <span className="text-xs font-medium capitalize">
            {isSyncing ? "Syncing..." : syncStatus}
          </span>
        </button>
      </div>
    </div>
  );
}
