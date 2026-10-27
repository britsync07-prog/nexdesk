"use client";

import { Minus, Plus, Users } from "lucide-react";

interface PersonCounterProps {
  value: number;
  onChange: (newVal: number) => void;
  max?: number;
  min?: number;
}

export function PersonCounter({ value, onChange, min = 1, max = 20 }: PersonCounterProps) {
  const quickPicks = [1, 2, 3, 5, 8, 10, 12, 15, 20];

  const handleDecrement = () => {
    if (value > min) onChange(value - 1);
  };

  const handleIncrement = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-sm font-medium text-[#131416]">
          <Users className="h-4 w-4 text-[#1b6c80]" />
          <span>Personnel Headcount (1 to 20)</span>
        </label>
        <span className="rounded-md bg-[#e5f1f4] px-2 py-0.5 text-xs font-medium text-[#135464]">
          {value} {value === 1 ? "Person" : "People"}
        </span>
      </div>

      {/* Touch-Friendly Stepper */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className="flex h-12 flex-1 items-center justify-center rounded-md border border-[#cdced1] bg-white text-[#131416] transition-colors hover:bg-[#f4f6f8] disabled:pointer-events-none disabled:opacity-30"
          aria-label="Decrease persons"
        >
          <Minus className="w-5 h-5" />
        </button>

        <div className="flex h-12 w-24 items-center justify-center rounded-md bg-white">
          <span className="text-2xl font-semibold tabular-nums text-[#131416]">{value}</span>
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          className="flex h-12 flex-1 items-center justify-center rounded-md bg-[#131416] text-white transition-colors hover:bg-[#2d3032] disabled:pointer-events-none disabled:opacity-30"
          aria-label="Increase persons"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Pick Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
        <span className="mr-1 text-xs text-[#5d5f60]">Quick:</span>
        {quickPicks.map((pick) => {
          const isSelected = value === pick;
          return (
            <button
              key={pick}
              type="button"
              onClick={() => onChange(pick)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                isSelected
                  ? "bg-[#e5f1f4] text-[#135464] font-semibold"
                  : "bg-white text-[#5d5f60] hover:text-[#131416]"
              }`}
            >
              {pick}
            </button>
          );
        })}
      </div>
    </div>
  );
}
