"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2 } from "lucide-react";

interface AutocompleteInputProps {
  id?: string;
  name?: string;
  field: "supervisedBy" | "factoryName" | "location" | "personName";
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  label?: string;
}

export function AutocompleteInput({
  id,
  field,
  value,
  onChange,
  placeholder,
  required = false,
  className = "",
  label,
}: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = (query: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/suggestions?field=${field}&query=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          if (data.suggestions && data.suggestions.length > 0) {
            setIsOpen(true);
          }
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }, 200);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
    setSelectedIndex(-1);
    fetchSuggestions(newVal);
  };

  const handleFocus = () => {
    fetchSuggestions(value);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[#131416]">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className={`w-full rounded-md border border-[#cdced1] bg-white px-3.5 py-2.5 text-sm text-[#131416] placeholder:text-[#777a7c] transition-colors focus:border-[#1b6c80] focus:outline-none focus:ring-2 focus:ring-[#1b6c80]/20 ${className}`}
        />
        {isLoading && (
          <div className="absolute right-3 top-3 text-[#5d5f60]">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1.5 max-h-56 left-0 right-0 overflow-y-auto rounded-md border border-[#cdced1] bg-white shadow-lg">
          <div className="flex items-center gap-1.5 border-b border-[#e8eaec] bg-[#f4f6f8] px-3 py-2 text-xs text-[#5d5f60]">
            <Sparkles className="h-3 w-3 text-[#1b6c80]" />
            <span>Past entries</span>
          </div>
          {suggestions.map((suggestion, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={suggestion + idx}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className={`w-full text-left px-3.5 py-2.5 text-sm flex items-center justify-between transition-colors ${
                  isSelected ? "bg-[#e5f1f4] text-[#131416]" : "text-[#131416] hover:bg-[#f4f6f8]"
                }`}
              >
                <span>{suggestion}</span>
                <span className={`text-xs ${isSelected ? "text-[#1b6c80]" : "text-[#5d5f60]"}`}>
                  History
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
