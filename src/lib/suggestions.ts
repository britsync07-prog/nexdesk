import { prisma } from "./prisma";

export type SuggestionField = "supervisedBy" | "factoryName" | "location" | "personName";

export interface SuggestionResult {
  value: string;
  count: number;
}

/**
 * Retrieves intelligent historical suggestions for a given field belonging strictly to userId.
 * Ranks prefix matches above substring matches, deduplicates results, and limits to top matches.
 */
export async function getHistoricalSuggestions(
  userId: string,
  field: SuggestionField,
  query: string,
  limit = 8
): Promise<string[]> {
  const cleanQuery = (query || "").trim().toLowerCase();

  let rawValues: { value: string }[] = [];

  if (field === "personName") {
    // Search person names from RecordPerson belonging to user's records
    const people = await prisma.recordPerson.findMany({
      where: {
        record: { userId },
        name: {
          not: "",
        },
      },
      select: { name: true },
      take: 200,
    });
    rawValues = people.map((p) => ({ value: p.name.trim() }));
  } else if (field === "supervisedBy") {
    const records = await prisma.shiftRecord.findMany({
      where: { userId, supervisedBy: { not: "" } },
      select: { supervisedBy: true },
      take: 200,
    });
    rawValues = records.map((r) => ({ value: r.supervisedBy.trim() }));
  } else if (field === "factoryName") {
    const records = await prisma.shiftRecord.findMany({
      where: { userId, factoryName: { not: "" } },
      select: { factoryName: true },
      take: 200,
    });
    rawValues = records.map((r) => ({ value: r.factoryName.trim() }));
  } else if (field === "location") {
    const records = await prisma.shiftRecord.findMany({
      where: { userId, location: { not: "" } },
      select: { location: true },
      take: 200,
    });
    rawValues = records.map((r) => ({ value: r.location.trim() }));
  }

  // Frequency aggregation and deduplication
  const frequencyMap = new Map<string, { original: string; count: number }>();
  for (const item of rawValues) {
    if (!item.value) continue;
    const lower = item.value.toLowerCase();
    const existing = frequencyMap.get(lower);
    if (existing) {
      existing.count += 1;
    } else {
      frequencyMap.set(lower, { original: item.value, count: 1 });
    }
  }

  const items = Array.from(frequencyMap.values());

  // Filter and rank:
  // Rank 1: exact match
  // Rank 2: prefix match (starts with cleanQuery)
  // Rank 3: substring match (includes cleanQuery)
  // Ties broken by frequency count (descending)
  const filteredAndRanked = items
    .filter((item) => {
      if (!cleanQuery) return true;
      return item.original.toLowerCase().includes(cleanQuery);
    })
    .sort((a, b) => {
      const lowerA = a.original.toLowerCase();
      const lowerB = b.original.toLowerCase();

      if (cleanQuery) {
        const aExact = lowerA === cleanQuery;
        const bExact = lowerB === cleanQuery;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        const aPrefix = lowerA.startsWith(cleanQuery);
        const bPrefix = lowerB.startsWith(cleanQuery);
        if (aPrefix && !bPrefix) return -1;
        if (!aPrefix && bPrefix) return 1;
      }

      // Frequency sorting
      return b.count - a.count;
    });

  return filteredAndRanked.slice(0, limit).map((item) => item.original);
}
