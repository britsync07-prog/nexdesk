import { google } from "googleapis";
import { prisma } from "./prisma";
import { decryptSecret, encryptSecret } from "./secrets";
import { isValidDateString } from "./record-validation";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";

export const REQUIRED_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets",
];

export const STANDARD_HEADERS = [
  "Record ID",
  "Date",
  "Shift",
  "Supervised By",
  "Factory Name",
  "Location",
  "Persons",
  "Person Names",
  "Remarks",
];

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(state?: string): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: REQUIRED_SCOPES,
    state: state || "default_auth",
  });
}

export async function getAuthenticatedClient(userId: string) {
  const integration = await prisma.googleIntegration.findUnique({
    where: { userId },
  });

  if (!integration || !integration.refreshToken) {
    throw new Error("Google integration not connected or refresh token missing.");
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: decryptSecret(integration.accessToken) || undefined,
    refresh_token: decryptSecret(integration.refreshToken),
    expiry_date: integration.tokenExpiry ? integration.tokenExpiry.getTime() : undefined,
  });

  // Handle token refreshing
  oauth2Client.on("tokens", async (tokens) => {
    await prisma.googleIntegration.update({
      where: { userId },
      data: {
        accessToken: tokens.access_token ? encryptSecret(tokens.access_token) : integration.accessToken,
        refreshToken: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : integration.refreshToken,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      },
    });
  });

  return { oauth2Client, integration };
}

/**
 * Searches user's Google Drive for existing spreadsheets matching the title.
 */
export async function searchSpreadsheets(userId: string, title = "ShiftLog Records") {
  const { oauth2Client } = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  // Escaping single quotes in title for Drive query
  const safeTitle = title.replace(/'/g, "\\'");
  const response = await drive.files.list({
    q: `name = '${safeTitle}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
    fields: "files(id, name, webViewLink, createdTime, modifiedTime)",
    spaces: "drive",
  });

  return response.data.files || [];
}

/**
 * Creates a brand new Google Spreadsheet with canonical "Records" sheet and headers.
 */
export async function createDesignatedSpreadsheet(userId: string, title = "ShiftLog Records") {
  const { oauth2Client } = await getAuthenticatedClient(userId);
  const sheets = google.sheets({ version: "v4", auth: oauth2Client });

  // Retrieve any custom columns for this user to append to the canonical headers
  const customColumns = await prisma.customColumn.findMany({
    where: { userId, isDeleted: false },
    orderBy: { order: "asc" },
  });

  const allHeaders = [...STANDARD_HEADERS, ...customColumns.map((c) => c.name)];

  const resource = {
    properties: { title },
    sheets: [
      {
        properties: {
          title: "Records",
          gridProperties: { rowCount: 1000, columnCount: Math.max(allHeaders.length + 5, 20) },
        },
      },
    ],
  };

  const createRes = await sheets.spreadsheets.create({
    requestBody: resource,
  });

  const spreadsheetId = createRes.data.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error("Failed to retrieve spreadsheet ID from Google response.");
  }

  // Insert Header Row with styling
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Records!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [allHeaders],
    },
  });

  // Update integration in database
  await prisma.googleIntegration.update({
    where: { userId },
    data: {
      spreadsheetId,
      spreadsheetName: title,
      sheetTabName: "Records",
      syncStatus: "synced",
      lastSyncAt: new Date(),
      lastError: null,
    },
  });

  await prisma.syncAuditLog.create({
    data: {
      userId,
      operation: "CREATE_SHEET",
      status: "SUCCESS",
      details: `Created designated spreadsheet: "${title}" (${spreadsheetId})`,
    },
  });

  return { spreadsheetId, name: title, webViewLink: createRes.data.spreadsheetUrl };
}

/**
 * Synchronize a single ShiftRecord to the connected Google Spreadsheet.
 */
export async function syncRecordToSheet(userId: string, recordId: string) {
  try {
    const { oauth2Client, integration } = await getAuthenticatedClient(userId);
    if (!integration.spreadsheetId) {
      throw new Error("No spreadsheet connected for this user.");
    }

    const record = await prisma.shiftRecord.findFirst({
      where: { id: recordId, userId },
      include: { persons: { orderBy: { personIndex: "asc" } } },
    });

    if (!record) throw new Error("Record not found.");

    const customColumns = await prisma.customColumn.findMany({
      where: { userId, isDeleted: false },
      orderBy: { order: "asc" },
    });

    const sheets = google.sheets({ version: "v4", auth: oauth2Client });
    const spreadsheetId = integration.spreadsheetId;
    const sheetTabName = integration.sheetTabName || "Records";
    const sheetRange = `'${sheetTabName.replace(/'/g, "''")}'`;

    // Read current headers to map columns accurately
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetRange}!1:1`,
    });

    let currentHeaders: string[] = headerRes.data.values?.[0] || [];
    if (currentHeaders.length === 0) {
      // Re-initialize headers if empty
      currentHeaders = [...STANDARD_HEADERS, ...customColumns.map((c) => c.name)];
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetRange}!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [currentHeaders] },
      });
    } else {
      const requiredHeaders = [...STANDARD_HEADERS, ...customColumns.map((column) => column.name)];
      const missingHeaders = requiredHeaders.filter((header) => !currentHeaders.includes(header));
      if (missingHeaders.length > 0) {
        currentHeaders = [...currentHeaders, ...missingHeaders];
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetRange}!A1`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [currentHeaders] },
        });
      }
    }

    // Build row values
    const personNamesStr = record.persons.map((p) => p.name).filter(Boolean).join(", ");
    let customMap: Record<string, string> = {};
    if (record.customValues) {
      try {
        customMap = JSON.parse(record.customValues);
      } catch {
        // ignore
      }
    }

    const rowData: Record<string, string | number> = {
      "Record ID": record.id,
      "Date": record.dateStr,
      "Shift": record.shift,
      "Supervised By": record.supervisedBy,
      "Factory Name": record.factoryName,
      "Location": record.location,
      "Persons": record.personsCount,
      "Person Names": personNamesStr,
      "Remarks": record.remarks || "",
    };

    // Add custom fields
    for (const col of customColumns) {
      rowData[col.name] = customMap[col.key] || "";
    }

    // Map row according to actual sheet headers
    const rowValues = currentHeaders.map((header) => String(rowData[header] ?? ""));

    // Check if record already exists in sheet by looking at Record ID column (Column A)
    const idColumnRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetRange}!A:A`,
    });

    const idRows = idColumnRes.data.values || [];
    let existingRowIndex = -1;
    for (let i = 1; i < idRows.length; i++) {
      if (idRows[i][0] === record.id) {
        existingRowIndex = i + 1; // 1-based index
        break;
      }
    }

    if (existingRowIndex > 0) {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetRange}!A${existingRowIndex}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [rowValues] },
      });
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetRange}!A1`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [rowValues] },
      });
    }

    // Mark as synchronized in database
    await prisma.shiftRecord.update({
      where: { id: record.id },
      data: {
        syncStatus: "synced",
        lastSyncedAt: new Date(),
        syncError: null,
      },
    });

    await prisma.googleIntegration.update({
      where: { userId },
      data: {
        syncStatus: "synced",
        lastSyncAt: new Date(),
        lastError: null,
      },
    });

    return { success: true };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Sync failed";
    await prisma.shiftRecord.update({
      where: { id: recordId },
      data: {
        syncStatus: "failed",
        syncError: errorMsg,
      },
    });

    await prisma.googleIntegration.update({
      where: { userId },
      data: {
        syncStatus: "error",
        lastError: errorMsg,
      },
    });

    throw error;
  }
}

/**
 * Reads existing spreadsheet rows and imports missing records into the database.
 */
export async function importFromSheet(userId: string) {
  const { oauth2Client, integration } = await getAuthenticatedClient(userId);
  if (!integration.spreadsheetId) {
    throw new Error("No spreadsheet connected.");
  }

  const sheets = google.sheets({ version: "v4", auth: oauth2Client });
  const spreadsheetId = integration.spreadsheetId;
  const sheetTabName = integration.sheetTabName || "Records";
  const sheetRange = `'${sheetTabName.replace(/'/g, "''")}'`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetRange}!A:Z`,
  });

  const rows = response.data.values || [];
  if (rows.length < 2) {
    return { importedCount: 0, message: "No data rows found in sheet." };
  }

  const headers = rows[0].map((h: string) => h.trim());
  const headerMap: Record<string, number> = {};
  headers.forEach((h: string, idx: number) => {
    headerMap[h.toLowerCase()] = idx;
  });

  const idCol = headerMap["record id"];
  const dateCol = headerMap["date"];
  const shiftCol = headerMap["shift"];
  const supCol = headerMap["supervised by"];
  const factoryCol = headerMap["factory name"];
  const locCol = headerMap["location"];
  const personsCol = headerMap["persons"];
  const namesCol = headerMap["person names"];
  const remarksCol = headerMap["remarks"];
  const customColumns = await prisma.customColumn.findMany({
    where: { userId, isDeleted: false },
    select: { key: true, name: true },
  });

  let importedCount = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rowRecordId = idCol !== undefined ? String(row[idCol] || "").trim() : "";
    const rowDateStr = dateCol !== undefined ? String(row[dateCol] || "").trim() : "";
    const rowShift = shiftCol !== undefined ? String(row[shiftCol] || "").trim() : "Day";
    const rowSupervisor = supCol !== undefined ? String(row[supCol] || "").trim() : "Supervisor";
    const rowFactory = factoryCol !== undefined ? String(row[factoryCol] || "").trim() : "Factory 1";
    const rowLocation = locCol !== undefined ? String(row[locCol] || "").trim() : "Floor";
    const rowPersonsCount = personsCol !== undefined ? parseInt(String(row[personsCol]), 10) || 1 : 1;
    const rowNamesStr = namesCol !== undefined ? String(row[namesCol] || "").trim() : "";
    const rowRemarks = remarksCol !== undefined ? String(row[remarksCol] || "").trim() : "";
    const customValues = Object.fromEntries(
      customColumns.flatMap((column) => {
        const columnIndex = headerMap[column.name.toLowerCase()];
        const value = columnIndex === undefined ? "" : String(row[columnIndex] || "").trim();
        return value ? [[column.key, value]] : [];
      })
    );

    if (!isValidDateString(rowDateStr)) continue;

    // Check if record already exists in database
    let existing = null;
    if (rowRecordId) {
      existing = await prisma.shiftRecord.findFirst({
        where: { id: rowRecordId, userId },
      });
    }

    if (!existing) {
      existing = await prisma.shiftRecord.findFirst({
        where: {
          userId,
          dateStr: rowDateStr,
          shift: rowShift,
          factoryName: rowFactory,
          supervisedBy: rowSupervisor,
        },
      });
    }

    if (existing) {
      // Record already exists; avoid duplicate
      continue;
    }

    // Split person names
    const names = rowNamesStr
      ? rowNamesStr.split(",").map((n) => n.trim()).filter(Boolean)
      : [];

    const validDate = new Date(`${rowDateStr}T00:00:00.000Z`);

    await prisma.shiftRecord.create({
      data: {
        userId,
        dateStr: rowDateStr,
        date: validDate,
        shift: rowShift.toLowerCase().includes("night") ? "Night" : "Day",
        supervisedBy: rowSupervisor,
        factoryName: rowFactory,
        location: rowLocation,
        personsCount: Math.min(Math.max(rowPersonsCount, 1), 20),
        remarks: rowRemarks,
        customValues: Object.keys(customValues).length > 0 ? JSON.stringify(customValues) : null,
        syncStatus: "synced",
        lastSyncedAt: new Date(),
        persons: {
          create: names.map((name, i) => ({
            personIndex: i + 1,
            name,
          })),
        },
      },
    });

    importedCount++;
  }

  await prisma.syncAuditLog.create({
    data: {
      userId,
      operation: "IMPORT",
      status: "SUCCESS",
      details: `Imported ${importedCount} records from Google Sheets`,
    },
  });

  return { importedCount };
}
