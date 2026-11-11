export type ValidRecordInput = {
  dateStr: string;
  factoryName: string;
  location: string;
  personsCount: number;
  personNames: string[];
  remarks: string | null;
  otherWorkerIndexes: number[];
  customValues: Record<string, string | number | boolean | null> | null;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function text(value: unknown, field: string, required = true, maxLength = 200): string | null {
  if (typeof value !== "string") {
    if (!required && (value === undefined || value === null)) return null;
    throw new Error(`${field} must be text.`);
  }
  const result = value.trim();
  if (required && !result) throw new Error(`${field} is required.`);
  if (result.length > maxLength) throw new Error(`${field} must be ${maxLength} characters or fewer.`);
  return result || null;
}

export function parseRecordInput(value: unknown): ValidRecordInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Request body must be an object.");
  const body = value as Record<string, unknown>;
  const dateStr = text(body.dateStr, "Date");
  if (!dateStr || !isValidDateString(dateStr)) {
    throw new Error("Date must use YYYY-MM-DD format.");
  }

  const count = Number(body.personsCount);
  if (!Number.isInteger(count) || count < 1 || count > 20) throw new Error("Personnel headcount must be between 1 and 20.");
  if (!Array.isArray(body.personNames) && body.personNames !== undefined) throw new Error("Person names must be an array.");

  const personNames = (body.personNames || []).slice(0, count).map((name, index) => text(name, `Person ${index + 1}`, false, 120) || "");
  const otherWorkerIndexes = Array.isArray(body.otherWorkerIndexes) ? body.otherWorkerIndexes.filter((index): index is number => Number.isInteger(index) && index >= 0 && index < count) : [];
  const location = text(body.location, "Location")!;
  if (!LOCATIONS.includes(location as (typeof LOCATIONS)[number])) throw new Error("Location is invalid.");
  if (personNames.some((name, index) => !otherWorkerIndexes.includes(index) && !isAllowedWorker(location, name))) throw new Error("Worker is not assigned to this location.");
  const customValues = body.customValues;
  if (customValues !== undefined && (customValues === null || typeof customValues !== "object" || Array.isArray(customValues))) {
    throw new Error("Custom values must be an object.");
  }
  const normalizedCustomValues = customValues ? Object.fromEntries(Object.entries(customValues as Record<string, unknown>).map(([key, item]) => {
    if (!/^[a-z0-9_]{1,32}$/.test(key) || !["string", "number", "boolean"].includes(typeof item) && item !== null) {
      throw new Error("Custom values contain an invalid entry.");
    }
    if (typeof item === "string" && item.length > 500) throw new Error("Custom values are too long.");
    return [key, item as string | number | boolean | null];
  })) : null;
  if (normalizedCustomValues && JSON.stringify(normalizedCustomValues).length > 10_000) throw new Error("Custom values are too large.");

  return {
    dateStr,
    factoryName: text(body.factoryName, "Factory")!,
    location,
    personsCount: count,
    personNames,
    remarks: text(body.remarks, "Remarks", false, 1000),
    otherWorkerIndexes,
    customValues: normalizedCustomValues,
  };
}
import { isAllowedWorker, LOCATIONS } from "./workforce";
