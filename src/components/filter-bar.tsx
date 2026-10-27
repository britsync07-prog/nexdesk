"use client";

import { useState } from "react";
import { Filter, X, Calendar, Sun } from "lucide-react";
import { AutocompleteInput } from "./autocomplete-input";

export interface FilterState {
  date: string;
  startDate: string;
  endDate: string;
  shift: string;
  factoryName: string;
  supervisedBy: string;
  location: string;
  personName: string;
}

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClear: () => void;
  resultCount: number;
}

export function FilterBar({ filters, onChange, onClear, resultCount }: FilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFilterList: { key: keyof FilterState; label: string; value: string }[] = [];
  if (filters.date) activeFilterList.push({ key: "date", label: "Date", value: filters.date });
  if (filters.startDate) activeFilterList.push({ key: "startDate", label: "From", value: filters.startDate });
  if (filters.endDate) activeFilterList.push({ key: "endDate", label: "To", value: filters.endDate });
  if (filters.shift && filters.shift !== "all") {
    activeFilterList.push({ key: "shift", label: "Shift", value: filters.shift });
  }
  if (filters.factoryName) activeFilterList.push({ key: "factoryName", label: "Factory", value: filters.factoryName });
  if (filters.supervisedBy) activeFilterList.push({ key: "supervisedBy", label: "Supervisor", value: filters.supervisedBy });
  if (filters.location) activeFilterList.push({ key: "location", label: "Location", value: filters.location });
  if (filters.personName) activeFilterList.push({ key: "personName", label: "Worker", value: filters.personName });

  const handleRemoveFilter = (key: keyof FilterState) => {
    onChange({ ...filters, [key]: "" });
  };

  return (
    <div className="space-y-3">
      {/* Search & Filter Header Toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              isOpen || activeFilterList.length > 0
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                : "bg-[#18181b] text-zinc-300 border border-zinc-700/80 hover:bg-zinc-800"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterList.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-blue-600 text-[10px] font-bold flex items-center justify-center">
                {activeFilterList.length}
              </span>
            )}
          </button>

          {activeFilterList.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-zinc-400 hover:text-zinc-200 underline decoration-zinc-600 underline-offset-4"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="text-xs font-mono text-zinc-400">
          <span className="text-white font-bold">{resultCount}</span> records match
        </div>
      </div>

      {/* Active Filter Pills Bar */}
      {activeFilterList.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {activeFilterList.map((item) => (
            <span
              key={item.key}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-200"
            >
              <span className="text-zinc-400 text-[10px] uppercase font-mono">{item.label}:</span>
              <span className="font-medium text-white">{item.value}</span>
              <button
                type="button"
                onClick={() => handleRemoveFilter(item.key)}
                className="hover:text-red-400 ml-0.5 text-zinc-400"
                aria-label={`Remove ${item.label} filter`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Expanded Filter Panel */}
      {isOpen && (
        <div className="p-4 rounded-2xl bg-[#121215] border border-zinc-800 space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* One day */}
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-400" /> One day
              </label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => onChange({ ...filters, date: e.target.value, startDate: "", endDate: "" })}
                className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100"
              />
            </div>

            {/* Date range */}
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-400" /> Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => onChange({ ...filters, startDate: e.target.value, date: "" })}
                className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-400" /> End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => onChange({ ...filters, endDate: e.target.value, date: "" })}
                className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100"
              />
            </div>

            {/* Shift */}
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1 flex items-center gap-1">
                <Sun className="w-3 h-3 text-amber-400" /> Shift
              </label>
              <select
                value={filters.shift}
                onChange={(e) => onChange({ ...filters, shift: e.target.value })}
                className="w-full bg-[#18181b] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100"
              >
                <option value="all">All Shifts</option>
                <option value="Day">Day Shift</option>
                <option value="Night">Night Shift</option>
              </select>
            </div>

            <AutocompleteInput field="personName" label="Worker name" placeholder="e.g. Tuhin" value={filters.personName} onChange={(personName) => onChange({ ...filters, personName })} />

            <AutocompleteInput field="factoryName" label="Factory" placeholder="e.g. Unit 2" value={filters.factoryName} onChange={(factoryName) => onChange({ ...filters, factoryName })} />

            <AutocompleteInput field="supervisedBy" label="Supervisor" placeholder="Supervisor name" value={filters.supervisedBy} onChange={(supervisedBy) => onChange({ ...filters, supervisedBy })} />

            <AutocompleteInput field="location" label="Location" placeholder="Section / Floor" value={filters.location} onChange={(location) => onChange({ ...filters, location })} />
          </div>
        </div>
      )}
    </div>
  );
}
