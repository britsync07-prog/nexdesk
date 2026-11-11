PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_ShiftRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "dateStr" TEXT NOT NULL,
  "date" DATETIME NOT NULL,
  "factoryName" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "personsCount" INTEGER NOT NULL DEFAULT 1,
  "customValues" TEXT,
  "syncStatus" TEXT NOT NULL DEFAULT 'pending',
  "sheetRowIndex" INTEGER,
  "lastSyncedAt" DATETIME,
  "syncError" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ShiftRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_ShiftRecord" ("id", "userId", "dateStr", "date", "factoryName", "location", "personsCount", "customValues", "syncStatus", "sheetRowIndex", "lastSyncedAt", "syncError", "createdAt", "updatedAt")
SELECT "id", "userId", "dateStr", "date", "factoryName", "location", "personsCount", CASE WHEN json_valid("customValues") THEN NULLIF(json_remove("customValues", '$.__personNotes'), '{}') ELSE NULL END, "syncStatus", "sheetRowIndex", "lastSyncedAt", "syncError", "createdAt", "updatedAt" FROM "ShiftRecord";

DROP TABLE "ShiftRecord";
ALTER TABLE "new_ShiftRecord" RENAME TO "ShiftRecord";
CREATE INDEX "ShiftRecord_userId_dateStr_idx" ON "ShiftRecord"("userId", "dateStr");
CREATE INDEX "ShiftRecord_userId_factoryName_idx" ON "ShiftRecord"("userId", "factoryName");
CREATE INDEX "ShiftRecord_userId_location_idx" ON "ShiftRecord"("userId", "location");

PRAGMA foreign_keys=ON;
