"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PersonCounter } from "./person-counter";
import { AutocompleteInput } from "./autocomplete-input";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { LOCATIONS, WORKERS_BY_LOCATION } from "@/lib/workforce";

interface CustomColumnDef {
  id: string;
  key: string;
  name: string;
  type: string;
  options: string | null;
  required: boolean;
}

interface RecordFormProps {
  initialRecord?: {
    id: string;
    dateStr: string;
    factoryName: string;
    location: string;
    personsCount: number;
    remarks?: string | null;
    customValues?: string | null;
    persons?: { personIndex: number; name: string }[];
  };
  onSuccess?: (recordId: string) => void;
}

export function RecordForm({ initialRecord, onSuccess }: RecordFormProps) {
  const router = useRouter();

  // Predefined fields
  const todayStr = new Date().toISOString().split("T")[0];
  const [dateStr, setDateStr] = useState(initialRecord?.dateStr || todayStr);
  const [factoryName, setFactoryName] = useState(initialRecord?.factoryName || "");
  const [location, setLocation] = useState(initialRecord?.location || "");
  const [personsCount, setPersonsCount] = useState<number>(initialRecord?.personsCount || 1);
  const [remarks, setRemarks] = useState(initialRecord?.remarks || "");

  // Dynamic Person Names (Store up to 20 names so changing count doesn't delete typed names!)
  const [personNames, setPersonNames] = useState<string[]>(() => {
    const arr = Array(20).fill("");
    if (initialRecord?.persons) {
      for (const p of initialRecord.persons) {
        if (p.personIndex >= 1 && p.personIndex <= 20) {
          arr[p.personIndex - 1] = p.name;
        }
      }
    }
    return arr;
  });
  const [otherWorkerIndexes, setOtherWorkerIndexes] = useState<Set<number>>(() => new Set(
    (initialRecord?.persons || []).flatMap((person, index) =>
      person.name !== "Hajira" && !(WORKERS_BY_LOCATION[initialRecord?.location as keyof typeof WORKERS_BY_LOCATION] || []).includes(person.name as never) ? [index] : [],
    ),
  ));
  // Custom Columns & Values
  const [customColumns, setCustomColumns] = useState<CustomColumnDef[]>([]);
  const [unavailableEmployees, setUnavailableEmployees] = useState<Set<string>>(new Set());
  const [customValues, setCustomValues] = useState<Record<string, string>>(() => {
    if (initialRecord?.customValues) {
      try {
        return JSON.parse(initialRecord.customValues);
      } catch {
        return {};
      }
    }
    return {};
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load custom columns for this user
  useEffect(() => { fetchCustomColumns(); }, []);

  useEffect(() => {
    if (!dateStr) return;
    fetch(`/api/records?date=${encodeURIComponent(dateStr)}&limit=200`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const names = (data?.records || [])
          .filter((record: { id: string }) => record.id !== initialRecord?.id)
          .flatMap((record: { persons?: { name: string }[] }) => record.persons || [])
          .map((person: { name: string }) => person.name);
        setUnavailableEmployees(new Set(names));
      })
      .catch(() => setUnavailableEmployees(new Set()));
  }, [dateStr, initialRecord?.id]);

  async function fetchCustomColumns() {
    try {
      const res = await fetch("/api/custom-columns");
      if (res.ok) {
        const data = await res.json();
        const columns = data.columns || [];
        setCustomColumns(columns.filter((column: CustomColumnDef) => !["employee_list", "factory_list", "location_section_list"].includes(column.key)));
      }
    } catch {
      // ignore
    }
  }

  const handlePersonNameChange = (index: number, name: string) => {
    setPersonNames((prev) => {
      const next = [...prev];
      next[index] = name;
      return next;
    });
  };
  const handleWorkerSelectionChange = (index: number, value: string) => {
    setOtherWorkerIndexes((previous) => {
      const next = new Set(previous);
      if (value === "__other__") next.add(index);
      else next.delete(index);
      return next;
    });
    handlePersonNameChange(index, value === "__other__" ? "" : value);
  };
  const handleLocationChange = (nextLocation: string) => {
    setLocation(nextLocation);
    setPersonNames(Array(20).fill(""));
    setOtherWorkerIndexes(new Set());
  };
  const selectedElsewhere = (index: number) => new Set(
    personNames.filter((name, currentIndex) => currentIndex !== index && name),
  );

  const handleCustomValueChange = (key: string, val: string) => {
    setCustomValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Basic validation
    if (!dateStr || !factoryName.trim() || !location.trim()) {
      setErrorMessage("Please fill in all required fields (Date, Factory, Location).");
      return;
    }
    if (personNames.slice(0, personsCount).some((name) => !name.trim())) {
      setErrorMessage("Select a worker for every personnel slot.");
      return;
    }

    // Custom required columns check
    for (const col of customColumns) {
      if (col.required && !customValues[col.key]?.trim()) {
        setErrorMessage(`Custom field "${col.name}" is required.`);
        return;
      }
    }

    setIsSubmitting(true);

    const payload = {
      dateStr,
      factoryName: factoryName.trim(),
      location: location.trim(),
      personsCount,
      remarks: remarks.trim() || null,
      personNames: personNames.slice(0, personsCount),
      otherWorkerIndexes: personNames.slice(0, personsCount).flatMap((name, index) => name && !((WORKERS_BY_LOCATION[location as keyof typeof WORKERS_BY_LOCATION] || []) as readonly string[]).includes(name) && name !== "Hajira" ? [index] : []),
      customValues,
    };

    try {
      const isEditing = !!initialRecord?.id;
      const url = isEditing ? `/api/records/${initialRecord.id}` : "/api/records";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save record.");
      }

      setSuccessMessage(isEditing ? "Record updated successfully!" : "Record saved successfully!");

      if (onSuccess) {
        onSuccess(data.record.id);
      } else {
        router.push("/history");
        router.refresh();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-12">
      {/* Alert Messages */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Date Field */}
        <div>
          <label htmlFor="record-date" className="mb-1.5 block text-sm font-medium text-[#131416]">
            Shift Date <span className="text-red-400">*</span>
          </label>
          <input
            id="record-date"
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            required
            className="w-full rounded-md border border-[#cdced1] bg-white px-3.5 py-2.5 text-sm text-[#131416] focus:border-[#1b6c80] focus:outline-none focus:ring-2 focus:ring-[#1b6c80]/20"
          />
        </div>

        <div>
          <label htmlFor="factoryName" className="mb-1.5 block text-sm font-medium text-[#131416]">
            Factory Name <span className="text-red-400">*</span>
          </label>
          <AutocompleteInput id="factoryName" field="factoryName" value={factoryName} onChange={setFactoryName} placeholder="Enter factory name" required />
        </div>
      </div>

      <div>
        <label htmlFor="location" className="mb-1.5 block text-sm font-medium text-[#131416]">Location / Section <span className="text-red-400">*</span></label>
        <select id="location" value={location} onChange={(e) => handleLocationChange(e.target.value)} required className="w-full rounded-md border border-[#cdced1] bg-white px-3.5 py-2.5 text-sm text-[#131416]">
          <option value="">Select location / section</option>
          {LOCATIONS.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="remarks" className="mb-1.5 block text-sm font-medium text-[#131416]">Remarks</label>
        <textarea id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} maxLength={1000} rows={3} placeholder="Add any note or remark" className="w-full rounded-md border border-[#cdced1] bg-white px-3.5 py-2.5 text-sm text-[#131416] focus:border-[#1b6c80] focus:outline-none focus:ring-2 focus:ring-[#1b6c80]/20" />
      </div>

      {/* Headcount Stepper (1 to 20) */}
      <div className="space-y-4 rounded-lg bg-[#f4f6f8] p-4">
        <PersonCounter value={personsCount} onChange={setPersonsCount} min={1} max={20} />

        {/* Dynamically Generated Person Name Inputs */}
        <div className="space-y-3 border-t border-[#e0e4e5] pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#131416]">
              Assigned Workers List ({personsCount})
            </span>
            <span className="text-xs text-[#5d5f60]">Suggestions from past records</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: personsCount }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2">
                <span className="w-6 shrink-0 text-center text-xs tabular-nums text-[#5d5f60]">
                  {i + 1}.
                </span>
                <div>
                  {location ? (
                    <>
                    <select
                      value={otherWorkerIndexes.has(i) ? "__other__" : (WORKERS_BY_LOCATION[location as keyof typeof WORKERS_BY_LOCATION] || []).includes(personNames[i] as never) || personNames[i] === "Hajira" ? personNames[i] : ""}
                      onChange={(e) => handleWorkerSelectionChange(i, e.target.value)}
                      className="w-full rounded-md border border-[#cdced1] bg-white px-3 py-2 text-sm text-[#131416]"
                    >
                      <option value="">Select worker</option>
                      <option value="Hajira" disabled={unavailableEmployees.has("Hajira") || selectedElsewhere(i).has("Hajira")}>Hajira</option>
                      {(WORKERS_BY_LOCATION[location as keyof typeof WORKERS_BY_LOCATION] || []).map((employee) => (
                        <option key={employee} value={employee} disabled={unavailableEmployees.has(employee) || selectedElsewhere(i).has(employee)}>
                          {employee}{unavailableEmployees.has(employee) ? " (already assigned today)" : ""}
                        </option>
                      ))}
                      <option value="__other__">Others</option>
                    </select>
                    {otherWorkerIndexes.has(i) && (
                      <input value={personNames[i] || ""} onChange={(e) => handlePersonNameChange(i, e.target.value)} placeholder="Enter worker name" className="mt-2 w-full rounded-md border border-[#cdced1] bg-white px-3 py-2 text-sm text-[#131416]" />
                    )}
                    </>
                  ) : (
                    <><select value={otherWorkerIndexes.has(i) ? "__other__" : personNames[i] === "Hajira" ? "Hajira" : ""} onChange={(e) => handleWorkerSelectionChange(i, e.target.value)} className="w-full rounded-md border border-[#cdced1] bg-white px-3 py-2 text-sm text-[#131416]"><option value="">Select worker</option><option value="Hajira">Hajira</option><option value="__other__">Others</option></select>{otherWorkerIndexes.has(i) && <input value={personNames[i] || ""} onChange={(e) => handlePersonNameChange(i, e.target.value)} placeholder="Enter worker name" className="mt-2 w-full rounded-md border border-[#cdced1] bg-white px-3 py-2 text-sm text-[#131416]" />}</>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Columns (if defined by user) */}
      {customColumns.length > 0 && (
        <div className="space-y-3 rounded-lg bg-[#f4f6f8] p-4">
          <div className="text-sm font-medium text-[#131416]">
            Custom Supervisor Columns
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customColumns.map((col) => {
              const val = customValues[col.key] || "";
              let optionsList: string[] = [];
              if (col.type === "SELECT" && col.options) {
                try {
                  optionsList = JSON.parse(col.options);
                } catch {
                  // ignore
                }
              }

              return (
                <div key={col.id}>
                  <label className="mb-1 block text-sm font-medium text-[#131416]">
                    {col.name} {col.required && <span className="text-red-400">*</span>}
                  </label>
                  {col.type === "SELECT" ? (
                    <select
                      value={val}
                      onChange={(e) => handleCustomValueChange(col.key, e.target.value)}
                      required={col.required}
                      className="w-full rounded-md border border-[#cdced1] bg-white px-3 py-2 text-sm text-[#131416] focus:border-[#1b6c80] focus:outline-none focus:ring-2 focus:ring-[#1b6c80]/20"
                    >
                      <option value="">Select an option</option>
                      {optionsList.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : col.type === "DATE" ? (
                    <input
                      type="date"
                      value={val}
                      onChange={(e) => handleCustomValueChange(col.key, e.target.value)}
                      required={col.required}
                      className="w-full rounded-md border border-[#cdced1] bg-white px-3 py-2 text-sm text-[#131416]"
                    />
                  ) : col.type === "NUMBER" ? (
                    <input
                      type="number"
                      value={val}
                      onChange={(e) => handleCustomValueChange(col.key, e.target.value)}
                      required={col.required}
                      placeholder={col.name}
                      className="w-full rounded-md border border-[#cdced1] bg-white px-3 py-2 text-sm text-[#131416]"
                    />
                  ) : (
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => handleCustomValueChange(col.key, e.target.value)}
                      required={col.required}
                      placeholder={col.name}
                      className="w-full rounded-md border border-[#cdced1] bg-white px-3 py-2 text-sm text-[#131416]"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Save Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#131416] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2d3032] disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Saving record…</span>
          </>
        ) : (
          <span>{initialRecord?.id ? "Update Shift Record" : "Save Shift Record"}</span>
        )}
      </button>
    </form>
  );
}
