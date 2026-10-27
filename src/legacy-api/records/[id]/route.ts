import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncRecordToSheet } from "@/lib/google";
import { parseRecordInput } from "@/lib/record-validation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const record = await prisma.shiftRecord.findFirst({
    where: { id, userId: session.user.id },
    include: {
      persons: { orderBy: { personIndex: "asc" } },
    },
  });

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  return NextResponse.json({ record });
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const existing = await prisma.shiftRecord.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  try {
    const input = parseRecordInput(await req.json());
    const validDate = new Date(`${input.dateStr}T00:00:00.000Z`);

    // Use transaction: delete old persons, recreate new persons, update record
    const updatedRecord = await prisma.$transaction(async (tx) => {
      await tx.recordPerson.deleteMany({
        where: { recordId: id },
      });

      return tx.shiftRecord.update({
        where: { id },
        data: {
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
    });

    // Re-sync with Google Sheet if connected
    try {
      const integration = await prisma.googleIntegration.findUnique({
        where: { userId: session.user.id },
      });
      if (integration?.spreadsheetId && integration.refreshToken) {
        await syncRecordToSheet(session.user.id, updatedRecord.id);
      }
    } catch {
      // Sync failure tracked via syncStatus on record
    }

    return NextResponse.json({ success: true, record: updatedRecord });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update record";
    const status = errorMsg.includes("must") || errorMsg.includes("required") || errorMsg.includes("invalid") || errorMsg.includes("between") || errorMsg.includes("too ") ? 400 : 500;
    return NextResponse.json({ error: status === 400 ? errorMsg : "Failed to update record" }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.shiftRecord.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  await prisma.shiftRecord.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
