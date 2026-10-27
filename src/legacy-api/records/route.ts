import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncRecordToSheet } from "@/lib/google";
import { Prisma } from "@prisma/client";
import { parseRecordInput } from "@/lib/record-validation";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const shift = searchParams.get("shift");
  const factoryName = searchParams.get("factoryName");
  const supervisedBy = searchParams.get("supervisedBy");
  const location = searchParams.get("location");
  const personName = searchParams.get("personName");
  const requestedLimit = Number.parseInt(searchParams.get("limit") || "100", 10);
  const requestedOffset = Number.parseInt(searchParams.get("offset") || "0", 10);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 100;
  const offset = Number.isInteger(requestedOffset) ? Math.max(requestedOffset, 0) : 0;

  const where: Prisma.ShiftRecordWhereInput = {
    userId: session.user.id,
  };

  // Exact date or date range
  if (date) {
    where.dateStr = date;
  } else if (startDate || endDate) {
    where.dateStr = {};
    if (startDate) where.dateStr.gte = startDate;
    if (endDate) where.dateStr.lte = endDate;
  }

  // Shift filter
  if (shift && shift !== "all") {
    where.shift = shift;
  }

  // Text filters (case-insensitive substring)
  if (factoryName) {
    where.factoryName = { contains: factoryName };
  }
  if (supervisedBy) {
    where.supervisedBy = { contains: supervisedBy };
  }
  if (location) {
    where.location = { contains: location };
  }

  // Person name match across associated personnel
  if (personName && personName.trim()) {
    where.persons = {
      some: {
        name: { contains: personName.trim() },
      },
    };
  }

  const [total, records] = await Promise.all([
    prisma.shiftRecord.count({ where }),
    prisma.shiftRecord.findMany({
      where,
      include: {
        persons: {
          orderBy: { personIndex: "asc" },
        },
      },
      orderBy: [{ dateStr: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    }),
  ]);

  return NextResponse.json({
    total,
    records,
    limit,
    offset,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const input = parseRecordInput(await req.json());
    const validDate = new Date(`${input.dateStr}T00:00:00.000Z`);

    // Save record + personnel in transaction
    const record = await prisma.shiftRecord.create({
      data: {
        userId: session.user.id,
        dateStr: input.dateStr,
        date: validDate,
        shift: input.shift,
        supervisedBy: input.supervisedBy,
        factoryName: input.factoryName,
        location: input.location,
        personsCount: input.personsCount,
        remarks: input.remarks,
        customValues: input.customValues ? JSON.stringify(input.customValues) : null,
        syncStatus: "pending",
        persons: {
          create: Array.from({ length: input.personsCount }, (_, i) => ({
            personIndex: i + 1,
            name: input.personNames[i],
          })),
        },
      },
      include: {
        persons: { orderBy: { personIndex: "asc" } },
      },
    });

    // Attempt Google Sheets synchronization if connected
    let syncErrorMsg: string | null = null;
    try {
      const integration = await prisma.googleIntegration.findUnique({
        where: { userId: session.user.id },
      });
      if (integration?.spreadsheetId && integration.refreshToken) {
        await syncRecordToSheet(session.user.id, record.id);
      }
    } catch (syncErr: unknown) {
      syncErrorMsg = syncErr instanceof Error ? syncErr.message : "Sync deferred";
    }

    return NextResponse.json(
      {
        success: true,
        record,
        syncDeferred: !!syncErrorMsg,
        syncError: syncErrorMsg,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create record";
    const status = errorMsg.includes("must") || errorMsg.includes("required") || errorMsg.includes("invalid") || errorMsg.includes("between") || errorMsg.includes("too ") ? 400 : 500;
    return NextResponse.json({ error: status === 400 ? errorMsg : "Failed to create record" }, { status });
  }
}
