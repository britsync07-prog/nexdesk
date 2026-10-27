import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  searchSpreadsheets,
  createDesignatedSpreadsheet,
  syncRecordToSheet,
  importFromSheet,
} from "@/lib/google";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integration = await prisma.googleIntegration.findUnique({
    where: { userId: session.user.id },
  });

  const auditLogs = await prisma.syncAuditLog.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const pendingRecordsCount = await prisma.shiftRecord.count({
    where: { userId: session.user.id, syncStatus: "pending" },
  });

  const failedRecordsCount = await prisma.shiftRecord.count({
    where: { userId: session.user.id, syncStatus: "failed" },
  });

  return NextResponse.json({
    connected: !!(integration && integration.refreshToken),
    spreadsheetId: integration?.spreadsheetId || null,
    spreadsheetName: integration?.spreadsheetName || "ShiftLog Records",
    sheetTabName: integration?.sheetTabName || "Records",
    syncStatus: integration?.syncStatus || "idle",
    lastSyncAt: integration?.lastSyncAt || null,
    lastError: integration?.lastError || null,
    pendingRecordsCount,
    failedRecordsCount,
    auditLogs,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = body.action;

    if (action === "discover") {
      const title = body.title || "ShiftLog Records";
      const files = await searchSpreadsheets(session.user.id, title);
      return NextResponse.json({ files });
    }

    if (action === "connect_existing") {
      const { spreadsheetId, name } = body;
      if (!spreadsheetId) {
        return NextResponse.json({ error: "Spreadsheet ID is required" }, { status: 400 });
      }

      await prisma.googleIntegration.update({
        where: { userId: session.user.id },
        data: {
          spreadsheetId,
          spreadsheetName: name || "Connected Spreadsheet",
          syncStatus: "idle",
        },
      });

      return NextResponse.json({ success: true });
    }

    if (action === "create_sheet") {
      const title = body.title || "ShiftLog Records";
      const result = await createDesignatedSpreadsheet(session.user.id, title);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "import_sheet") {
      const result = await importFromSheet(session.user.id);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "sync_all") {
      const recordsToSync = await prisma.shiftRecord.findMany({
        where: {
          userId: session.user.id,
          syncStatus: { in: ["pending", "failed"] },
        },
        select: { id: true },
        take: 50,
      });

      let syncedCount = 0;
      let failedCount = 0;

      for (const rec of recordsToSync) {
        try {
          await syncRecordToSheet(session.user.id, rec.id);
          syncedCount++;
        } catch {
          failedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        totalAttempted: recordsToSync.length,
        syncedCount,
        failedCount,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Sync action failed";
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Sync action failed." : errorMsg }, { status: 500 });
  }
}
