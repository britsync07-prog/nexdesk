"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sun,
  Moon,
  Users,
  MapPin,
  Building,
  User,
  Calendar,
  Cloud,
  CloudOff,
  Clock,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface RecordItem {
  id: string;
  dateStr: string;
  shift: string;
  supervisedBy: string;
  factoryName: string;
  location: string;
  personsCount: number;
  remarks?: string | null;
  customValues?: string | null;
  syncStatus: string;
  lastSyncedAt?: string | null;
  persons: { id: string; personIndex: number; name: string }[];
}

interface RecordCardProps {
  record: RecordItem;
  onDelete?: (id: string) => void;
}

export function RecordCard({ record, onDelete }: RecordCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  let customMap: Record<string, string> = {};
  if (record.customValues) {
    try {
      customMap = JSON.parse(record.customValues);
    } catch {
      // ignore
    }
  }
  const personNotes = Array.isArray(customMap.__personNotes) ? customMap.__personNotes as unknown as string[] : [];
  delete customMap.__personNotes;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/records/${record.id}`, { method: "DELETE" });
      if (res.ok && onDelete) {
        setShowDeleteConfirm(false);
        onDelete(record.id);
      }
    } catch {
      alert("Failed to delete record.");
    } finally {
      setIsDeleting(false);
    }
  };

  const isNight = record.shift.toLowerCase() === "night";

  return (
    <div className="rounded-2xl bg-[#121215] border border-zinc-800/90 hover:border-zinc-700/80 transition-all p-4 space-y-3 shadow-sm">
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Shift Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
              isNight
                ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
            }`}
          >
            {isNight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            <span>{record.shift} Shift</span>
          </span>

          {/* Date */}
          <span className="text-xs font-mono font-medium text-zinc-300 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            {record.dateStr}
          </span>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-1">
          {record.syncStatus === "synced" ? (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20"
              title="Synchronized with Google Sheets"
            >
              <Cloud className="w-3 h-3" /> Synced
            </span>
          ) : record.syncStatus === "failed" ? (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20"
              title="Sync failed"
            >
              <CloudOff className="w-3 h-3" /> Error
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20"
              title="Pending sync"
            >
              <Clock className="w-3 h-3" /> Pending
            </span>
          )}
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-zinc-300">
          <Building className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span className="truncate">{record.factoryName}</span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-300">
          <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span className="truncate">{record.location}</span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-400">
          <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span className="truncate">Sup: {record.supervisedBy}</span>
        </div>
        <div className="flex items-center gap-1.5 text-blue-400 font-mono font-semibold">
          <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>{record.personsCount} Personnel</span>
        </div>
      </div>

      {/* Worker Names Pill Tray */}
      {record.persons && record.persons.length > 0 && (
        <div className="pt-2 border-t border-zinc-800/80">
          <div className="flex flex-wrap gap-1.5">
            {record.persons.slice(0, isExpanded ? 20 : 5).map((p) => (
              <span key={p.id} className="inline-block rounded-md bg-zinc-800/90 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                {p.name || `Person ${p.personIndex}`}
                {personNotes[p.personIndex - 1] ? <span className="ml-1 text-zinc-500">— {personNotes[p.personIndex - 1]}</span> : null}
              </span>
            ))}
            {!isExpanded && record.persons.length > 5 && (
              <span className="inline-block px-1.5 py-0.5 rounded-md bg-zinc-900 text-zinc-500 text-[11px] font-mono">
                +{record.persons.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Expandable Section for Custom Fields & Remarks */}
      {isExpanded && (
        <div className="pt-3 border-t border-zinc-800 space-y-2 text-xs animate-in fade-in duration-150">
          {Object.keys(customMap).length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-zinc-500">Custom Fields:</span>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(customMap).map(([key, val]) => (
                  <div key={key} className="bg-zinc-900/80 p-2 rounded-lg border border-zinc-800/60">
                    <span className="text-[10px] font-mono text-zinc-500 block uppercase">{key}:</span>
                    <span className="text-zinc-200 font-medium">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {record.remarks && (
            <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/60 text-zinc-300 italic">
              &ldquo;{record.remarks}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Card Actions Footer */}
      <div className="pt-2 flex items-center justify-between border-t border-zinc-800/80">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-mono"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" /> Less
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> Details
            </>
          )}
        </button>

        <div className="flex items-center gap-2">
          <Link
            href={`/add-record?edit=${record.id}`}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 transition-colors"
            title="Edit Record"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors disabled:opacity-50"
            title="Delete Record"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`delete-record-${record.id}`}
        >
          <div className="w-full max-w-sm rounded-xl border border-[#e0e4e5] bg-white p-5 text-[#131416] shadow-xl">
            <h2 id={`delete-record-${record.id}`} className="text-base font-semibold">Delete this record?</h2>
            <p className="mt-2 text-sm text-[#5d5f60]">
              This will permanently delete the {record.dateStr} record for {record.factoryName}.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="rounded-md border border-[#cdced1] px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-md bg-[#131416] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
