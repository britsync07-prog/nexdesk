"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { IOSInstallGuide } from "@/components/ios-install-guide";
import {
  User,
  FileSpreadsheet,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Columns3,
  Loader2,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

interface IntegrationData {
  connected: boolean;
  spreadsheetId: string | null;
  spreadsheetName: string;
  sheetTabName: string;
  syncStatus: string;
  lastSyncAt: string | null;
  lastError: string | null;
  pendingRecordsCount: number;
  failedRecordsCount: number;
}

interface CustomColumnItem {
  id: string;
  key: string;
  name: string;
  type: string;
  options: string | null;
  required: boolean;
}

export default function SettingsPage() {
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [integration, setIntegration] = useState<IntegrationData | null>(null);
  const [customColumns, setCustomColumns] = useState<CustomColumnItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // New Column Form State
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState("TEXT");
  const [newColOptions, setNewColOptions] = useState("");
  const [newColRequired, setNewColRequired] = useState(false);
  const [isAddingColumn, setIsAddingColumn] = useState(false);

  const loadSettingsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [userRes, syncRes, colsRes] = await Promise.all([
        fetch("/api/auth/session"),
        fetch("/api/sync"),
        fetch("/api/custom-columns"),
      ]);

      if (userRes.ok) {
        const uData = await userRes.json();
        if (!uData.user) {
          router.replace("/login");
          return;
        }
        setUser(uData.user);
      } else {
        router.replace("/login");
        return;
      }
      if (syncRes.ok) {
        const sData = await syncRes.json();
        setIntegration(sData);
      }
      if (colsRes.ok) {
        const cData = await colsRes.json();
        setCustomColumns(cData.columns || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadSettingsData();
  }, [loadSettingsData]);

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_all" }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: "success",
          text: `Synchronization complete. Synced: ${data.syncedCount}, Failed: ${data.failedCount}`,
        });
        await loadSettingsData();
      } else {
        setMessage({ type: "error", text: data.error || "Sync failed" });
      }
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Sync error" });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateSheet = async () => {
    setIsCreatingSheet(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_sheet", title: "ShiftLog Records" }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: "success",
          text: `Created Google Sheet "ShiftLog Records" in your Drive!`,
        });
        await loadSettingsData();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to create spreadsheet." });
      }
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Creation error" });
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    setIsAddingColumn(true);
    setMessage(null);
    try {
      const res = await fetch("/api/custom-columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newColName.trim(),
          type: newColType,
          options: newColType === "SELECT" ? newColOptions : null,
          required: newColRequired,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewColName("");
        setNewColOptions("");
        setNewColRequired(false);
        setMessage({ type: "success", text: `Custom column "${data.column.name}" created!` });
        await loadSettingsData();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to add column" });
      }
    } catch {
      setMessage({ type: "error", text: "Error creating column" });
    } finally {
      setIsAddingColumn(false);
    }
  };

  const handleDeleteColumn = async (col: CustomColumnItem) => {
    if (!confirm(`Delete custom column "${col.name}"? Historical record values will be safely retained.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/custom-columns/${col.id}`, { method: "DELETE" });
      if (res.ok) {
        setCustomColumns((prev) => prev.filter((c) => c.id !== col.id));
        setMessage({ type: "success", text: `Column "${col.name}" removed.` });
      }
    } catch {
      alert("Failed to delete column");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const spreadsheetLink = integration?.spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${integration.spreadsheetId}`
    : null;

  return (
    <div className="nex-app min-h-screen bg-[#e4eae6] p-2 md:pl-[236px]">
      <Header onOpenInstallGuide={() => setShowInstallGuide(true)} />
      <IOSInstallGuide isOpen={showInstallGuide} onClose={() => setShowInstallGuide(false)} />

      <div className="mx-auto min-h-[calc(100svh-1rem)] max-w-5xl rounded-[16px] border border-[#e8eaec] bg-white px-4 py-6 space-y-6 md:px-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#131416] tracking-tight">Settings & Accounts</h1>
          <p className="text-xs text-zinc-400">
            Manage your Google Workspace integration, customize shift columns, and configure PWA installation.
          </p>
        </div>

        {isLoading && (
          <div className="py-12 flex items-center justify-center gap-2 text-zinc-500 text-xs font-mono">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span>Loading settings...</span>
          </div>
        )}

        {/* Status Notification */}
        {message && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 ${
              message.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                : "bg-red-500/10 border border-red-500/20 text-red-300"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* 1. Account Profile Card */}
        <div className="p-5 rounded-3xl bg-[#121215] border border-zinc-800 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-blue-400">
              <User className="w-4 h-4" />
              <span>Supervisor Account</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-zinc-400 hover:text-red-400 flex items-center gap-1 font-mono transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg font-bold text-white shrink-0">
              {user?.name ? user.name[0].toUpperCase() : "U"}
            </div>
            <div className="space-y-0.5">
              <p className="font-bold text-sm text-white">{user?.name || "Shift Lead"}</p>
              <p className="text-xs text-zinc-400 font-mono">{user?.email}</p>
              <span className="inline-block px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 font-mono">
                Authenticated User ID: {user?.id.slice(0, 8)}...
              </span>
            </div>
          </div>
        </div>

        {/* 2. Google Workspace & Drive Integration */}
        <div className="p-5 rounded-3xl bg-[#121215] border border-zinc-800 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-emerald-400">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Google Drive & Sheets Integration</span>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full capitalize ${
                integration?.connected
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {integration?.connected ? "Connected" : "Disconnected"}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                <span className="text-[10px] font-mono text-zinc-500 block uppercase">Target Spreadsheet</span>
                <p className="font-semibold text-white mt-0.5">
                  {integration?.spreadsheetName || "ShiftLog Records"}
                </p>
                {spreadsheetLink && (
                  <a
                    href={spreadsheetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 mt-1"
                  >
                    <span>Open in Google Sheets</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                <span className="text-[10px] font-mono text-zinc-500 block uppercase">Sync Status</span>
                <p className="font-semibold text-white mt-0.5 capitalize">
                  {integration?.syncStatus || "idle"}
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Pending: {integration?.pendingRecordsCount || 0} * Failed: {integration?.failedRecordsCount || 0}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleSyncAll}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs active:scale-95 transition-all disabled:opacity-50"
              >
                {isSyncing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>Sync All Pending Records</span>
              </button>

              {!integration?.spreadsheetId && (
                <button
                  type="button"
                  onClick={handleCreateSheet}
                  disabled={isCreatingSheet}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs active:scale-95 transition-all disabled:opacity-50"
                >
                  {isCreatingSheet ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  )}
                  <span>Create ShiftLog Spreadsheet in Drive</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. Manage Custom Columns */}
        <div className="p-5 rounded-3xl bg-[#121215] border border-zinc-800 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-purple-400">
              <Columns3 className="w-4 h-4" />
              <span>Manage Custom Columns</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">
              {customColumns.length} Active Custom Columns
            </span>
          </div>

          {/* Active Columns List */}
          {customColumns.length > 0 ? (
            <div className="space-y-2">
              {customColumns.map((col) => (
                <div
                  key={col.id}
                  className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-semibold text-white">{col.name}</span>
                    <span className="ml-2 font-mono text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                      {col.type}
                    </span>
                    {col.required && (
                      <span className="ml-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        Required
                      </span>
                    )}
                    {col.options && (
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        Options: {col.options}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteColumn(col)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800"
                    title="Remove column"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">
              No custom columns defined yet. Add extra fields like &ldquo;Machine #&rdquo; or &ldquo;Department&rdquo; below.
            </p>
          )}

          {/* Add New Column Form */}
          <form onSubmit={handleAddColumn} className="pt-2 border-t border-zinc-800 space-y-3">
            <span className="text-xs font-semibold text-zinc-200 block">Add New Custom Field</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                placeholder="Column Name (e.g. Machine #)"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                required
                className="bg-[#18181b] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100"
              />
              <select
                value={newColType}
                onChange={(e) => setNewColType(e.target.value)}
                className="bg-[#18181b] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100"
              >
                <option value="TEXT">Text</option>
                <option value="NUMBER">Number</option>
                <option value="DATE">Date</option>
                <option value="SELECT">Select Dropdown</option>
              </select>
              {newColType === "SELECT" && (
                <input
                  type="text"
                  placeholder="Options comma-separated"
                  value={newColOptions}
                  onChange={(e) => setNewColOptions(e.target.value)}
                  className="bg-[#18181b] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100"
                />
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newColRequired}
                  onChange={(e) => setNewColRequired(e.target.checked)}
                  className="rounded bg-zinc-800 border-zinc-700 text-blue-600 focus:ring-0"
                />
                <span>Mark as required field</span>
              </label>

              <button
                type="submit"
                disabled={isAddingColumn || !newColName.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs active:scale-95 transition-all disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Column</span>
              </button>
            </div>
          </form>
        </div>

        {/* 4. PWA Installation & Device Instructions */}
        <div className="p-5 rounded-3xl bg-[#121215] border border-zinc-800 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-amber-400">
              <Smartphone className="w-4 h-4" />
              <span>Mobile Device & PWA Installation</span>
            </div>
            <button
              onClick={() => setShowInstallGuide(true)}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
            >
              View Instructions
            </button>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            ShiftLog is a progressive web app. On iPhone Safari, tap <strong>Share &rarr; Add to Home Screen</strong>.
            On Android Chrome, tap the <strong>Install</strong> or <strong>Add to Home Screen</strong> banner.
          </p>
        </div>

        {/* 5. Privacy Policy & Compliance */}
        <div className="p-5 rounded-3xl bg-[#121215] border border-zinc-800 shadow-md space-y-3 text-left">
          <div className="flex items-center gap-2 text-xs font-mono uppercase text-zinc-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Privacy Policy & Data Handling</span>
          </div>
          <div className="space-y-2 text-[11px] text-zinc-400 leading-relaxed">
            <p>
              ShiftLog operates strictly on a supervisor-isolated multi-tenant model. We access your Google account solely to authenticate your identity and synchronize designated shift log spreadsheets to your own Google Drive.
            </p>
            <p>
              We do not share, sell, or index your worker names or operational remarks. All database records remain bound to your authenticated user identifier.
            </p>
          </div>
        </div>

        {/* App Version */}
        <div className="text-center text-[10px] font-mono text-zinc-600">
          ShiftLog v1.0.0 (Production PWA) * Database: Prisma Relational Core
        </div>
      </div>
    </div>
  );
}
