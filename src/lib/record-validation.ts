export type ValidRecordInput = {
  dateStr: string;
  shift: "Day" | "Night";
  supervisedBy: string;
  factoryName: string;
  location: string;
  personsCount: number;
  personNames: string[];
  remarks: string | null;
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
  if (body.shift !== "Day" && body.shift !== "Night") throw new Error("Shift must be Day or Night.");
  if (!Array.isArray(body.personNames) && body.personNames !== undefined) throw new Error("Person names must be an array.");

  const personNames = (body.personNames || []).slice(0, count).map((name, index) => text(name, `Person ${index + 1}`, false, 120) || "");
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
    shift: body.shift,
    supervisedBy: text(body.supervisedBy, "Supervisor")!,
    factoryName: text(body.factoryName, "Factory")!,
    location: text(body.location, "Location")!,
    personsCount: count,
    personNames,
    remarks: text(body.remarks, "Remarks", false, 4_000),
    customValues: normalizedCustomValues,
  };
}
