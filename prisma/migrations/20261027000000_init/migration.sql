-- CreateTable
CREATE TABLE "User" ("id" TEXT NOT NULL PRIMARY KEY, "email" TEXT NOT NULL, "name" TEXT, "image" TEXT, "googleId" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL);
CREATE TABLE "GoogleIntegration" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "spreadsheetId" TEXT, "spreadsheetName" TEXT DEFAULT 'ShiftLog Records', "sheetTabId" INTEGER DEFAULT 0, "sheetTabName" TEXT DEFAULT 'Records', "accessToken" TEXT, "refreshToken" TEXT, "tokenExpiry" DATETIME, "scopes" TEXT, "syncStatus" TEXT NOT NULL DEFAULT 'idle', "lastSyncAt" DATETIME, "lastError" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "GoogleIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE TABLE "CustomColumn" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "key" TEXT NOT NULL, "name" TEXT NOT NULL, "type" TEXT NOT NULL, "options" TEXT, "required" BOOLEAN NOT NULL DEFAULT false, "order" INTEGER NOT NULL DEFAULT 0, "isDeleted" BOOLEAN NOT NULL DEFAULT false, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "CustomColumn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE TABLE "ShiftRecord" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "dateStr" TEXT NOT NULL, "date" DATETIME NOT NULL, "shift" TEXT NOT NULL, "supervisedBy" TEXT NOT NULL, "factoryName" TEXT NOT NULL, "location" TEXT NOT NULL, "personsCount" INTEGER NOT NULL DEFAULT 1, "remarks" TEXT, "customValues" TEXT, "syncStatus" TEXT NOT NULL DEFAULT 'pending', "sheetRowIndex" INTEGER, "lastSyncedAt" DATETIME, "syncError" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "ShiftRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE TABLE "RecordPerson" ("id" TEXT NOT NULL PRIMARY KEY, "recordId" TEXT NOT NULL, "personIndex" INTEGER NOT NULL, "name" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "RecordPerson_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "ShiftRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE TABLE "SyncAuditLog" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "operation" TEXT NOT NULL, "status" TEXT NOT NULL, "details" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "SyncAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
CREATE UNIQUE INDEX "GoogleIntegration_userId_key" ON "GoogleIntegration"("userId");
CREATE INDEX "CustomColumn_userId_order_idx" ON "CustomColumn"("userId", "order");
CREATE UNIQUE INDEX "CustomColumn_userId_key_key" ON "CustomColumn"("userId", "key");
CREATE INDEX "ShiftRecord_userId_dateStr_idx" ON "ShiftRecord"("userId", "dateStr");
CREATE INDEX "ShiftRecord_userId_shift_idx" ON "ShiftRecord"("userId", "shift");
CREATE INDEX "ShiftRecord_userId_supervisedBy_idx" ON "ShiftRecord"("userId", "supervisedBy");
CREATE INDEX "ShiftRecord_userId_factoryName_idx" ON "ShiftRecord"("userId", "factoryName");
CREATE INDEX "ShiftRecord_userId_location_idx" ON "ShiftRecord"("userId", "location");
CREATE INDEX "RecordPerson_recordId_idx" ON "RecordPerson"("recordId");
CREATE INDEX "RecordPerson_name_idx" ON "RecordPerson"("name");
CREATE INDEX "SyncAuditLog_userId_createdAt_idx" ON "SyncAuditLog"("userId", "createdAt");
