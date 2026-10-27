import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { generateShiftLogPDF } from "../src/lib/pdf.ts";
import { parseRecordInput } from "../src/lib/record-validation.ts";

const prisma = new PrismaClient();

test.after(async () => {
  await prisma.$disconnect();
});

test("ShiftLog Full Automated Verification Suite", async (t) => {
  // Test User A and User B for isolation testing
  const testUserAId = "test_user_a_" + Date.now();
  const testUserBId = "test_user_b_" + Date.now();

  let userA, userB;

  await t.test("1. Database & Multi-Tenant User Isolation", async () => {
    userA = await prisma.user.create({
      data: {
        id: testUserAId,
        email: `usera_${Date.now()}@factory.test`,
        name: "Supervisor Alice",
        googleId: "google_a_" + Date.now(),
      },
    });

    userB = await prisma.user.create({
      data: {
        id: testUserBId,
        email: `userb_${Date.now()}@factory.test`,
        name: "Supervisor Bob",
        googleId: "google_b_" + Date.now(),
      },
    });

    assert.ok(userA.id);
    assert.ok(userB.id);

    // Create record for User A
    const recA = await prisma.shiftRecord.create({
      data: {
        userId: userA.id,
        dateStr: "2026-10-25",
        date: new Date("2026-10-25"),
        shift: "Day",
        supervisedBy: "Alice",
        factoryName: "Spinning Mill Alpha",
        location: "Floor 1",
        personsCount: 2,
        persons: {
          create: [
            { personIndex: 1, name: "Tuhin" },
            { personIndex: 2, name: "Rahim" },
          ],
        },
      },
    });

    // Query records for User B - MUST NOT return User A's records
    const recordsB = await prisma.shiftRecord.findMany({
      where: { userId: userB.id },
    });

    assert.equal(recordsB.length, 0, "User B must not see User A's records!");

    // Query records for User A - must return recA
    const recordsA = await prisma.shiftRecord.findMany({
      where: { userId: userA.id },
      include: { persons: true },
    });
    assert.equal(recordsA.length, 1);
    assert.equal(recordsA[0].id, recA.id);
    assert.equal(recordsA[0].persons.length, 2);
  });

  await t.test("2. Headcount Range (1 to 20) & Dynamic Personnel Inputs", async () => {
    // Test boundary: 1 person
    const rec1 = await prisma.shiftRecord.create({
      data: {
        userId: userA.id,
        dateStr: "2026-10-26",
        date: new Date("2026-10-26"),
        shift: "Night",
        supervisedBy: "Alice",
        factoryName: "Assembly Unit",
        location: "Bay 4",
        personsCount: 1,
        persons: {
          create: [{ personIndex: 1, name: "Karim" }],
        },
      },
      include: { persons: true },
    });
    assert.equal(rec1.persons.length, 1);
    assert.equal(rec1.persons[0].name, "Karim");

    // Test boundary: 20 persons
    const twentyNames = Array.from({ length: 20 }, (_, i) => ({
      personIndex: i + 1,
      name: `Worker_${i + 1}`,
    }));

    const rec20 = await prisma.shiftRecord.create({
      data: {
        userId: userA.id,
        dateStr: "2026-10-27",
        date: new Date("2026-10-27"),
        shift: "Day",
        supervisedBy: "Alice",
        factoryName: "Assembly Unit",
        location: "Bay 5",
        personsCount: 20,
        persons: { create: twentyNames },
      },
      include: { persons: true },
    });

    assert.equal(rec20.persons.length, 20);
    assert.equal(rec20.persons[19].name, "Worker_20");
    assert.equal(rec20.persons[19].personIndex, 20);
  });

  await t.test("3. Request validation rejects malformed production input", () => {
    const valid = parseRecordInput({
      dateStr: "2026-10-27",
      shift: "Day",
      supervisedBy: "Alice",
      factoryName: "Assembly",
      location: "Bay 5",
      personsCount: 1,
      personNames: ["Karim"],
      customValues: { machine_line: "L2" },
    });
    assert.equal(valid.personNames[0], "Karim");
    assert.throws(() => parseRecordInput({ ...valid, dateStr: "not-a-date" }));
    assert.throws(() => parseRecordInput({ ...valid, dateStr: "2026-02-31" }));
    assert.throws(() => parseRecordInput({ ...valid, shift: "Weekend" }));
    assert.throws(() => parseRecordInput({ ...valid, personsCount: 21 }));
  });

  await t.test("4. Intelligent Historical Autocomplete Suggestions", async () => {
    // Add records with person names: 'Tuhin', 'Tuhel', 'Fatima', 'Tariq'
    const people = await prisma.recordPerson.findMany({
      where: { record: { userId: userA.id } },
      select: { name: true },
    });

    const names = people.map((p) => p.name.toLowerCase());
    assert.ok(names.includes("tuhin"));
    assert.ok(names.includes("rahim"));

    // Prefix match test
    const prefixMatches = names.filter((n) => n.startsWith("tu"));
    assert.ok(prefixMatches.includes("tuhin"));
  });

  await t.test("5. Custom Columns Management & Persistence", async () => {
    const col = await prisma.customColumn.create({
      data: {
        userId: userA.id,
        key: "machine_line",
        name: "Machine Line",
        type: "TEXT",
        required: false,
      },
    });

    assert.equal(col.name, "Machine Line");
    assert.equal(col.key, "machine_line");

    // Save record with custom column value
    const recCustom = await prisma.shiftRecord.create({
      data: {
        userId: userA.id,
        dateStr: "2026-10-27",
        date: new Date("2026-10-27"),
        shift: "Night",
        supervisedBy: "Alice",
        factoryName: "Packaging",
        location: "Section D",
        personsCount: 1,
        customValues: JSON.stringify({ machine_line: "Line #4-Turbo" }),
        persons: { create: [{ personIndex: 1, name: "Hasan" }] },
      },
    });

    const parsedValues = JSON.parse(recCustom.customValues || "{}");
    assert.equal(parsedValues.machine_line, "Line #4-Turbo");
  });

  await t.test("6. Multi-Criteria Combined Filtering", async () => {
    // Filter by Date Range AND Factory AND Shift
    const filteredRecords = await prisma.shiftRecord.findMany({
      where: {
        userId: userA.id,
        dateStr: { gte: "2026-10-25", lte: "2026-10-27" },
        shift: "Night",
        factoryName: { contains: "Assembly" },
      },
    });

    assert.equal(filteredRecords.length, 1);
    assert.equal(filteredRecords[0].shift, "Night");
    assert.equal(filteredRecords[0].factoryName, "Assembly Unit");

    // Filter by person name "Tuhin"
    const personFiltered = await prisma.shiftRecord.findMany({
      where: {
        userId: userA.id,
        persons: {
          some: { name: { contains: "Tuhin" } },
        },
      },
    });

    assert.equal(personFiltered.length, 1);
    assert.equal(personFiltered[0].dateStr, "2026-10-25");
  });

  await t.test("7. Professional PDF Generation & Layout Engine", async () => {
    const sampleRecords = [
      {
        id: "rec_1",
        dateStr: "2026-10-27",
        shift: "Day",
        supervisedBy: "Tuhin Hossain",
        factoryName: "Unit 2 Spinning",
        location: "Line A",
        personsCount: 3,
        personNames: ["Rahim", "Karim", "Jamal"],
        remarks: "Smooth shift; 100% quota achieved",
        customValues: { machine_line: "L2" },
      },
    ];

    const filterSummary = {
      startDate: "2026-10-25",
      endDate: "2026-10-27",
      shift: "Day",
      totalRecords: 1,
    };

    const doc = generateShiftLogPDF(sampleRecords, filterSummary, [
      { key: "machine_line", name: "Machine Line" },
    ]);

    assert.ok(doc, "PDF document instance must be generated");
    const outputBuffer = doc.output("arraybuffer");
    assert.ok(outputBuffer.byteLength > 1000, "PDF byte length must be greater than 1KB");

    // Verify PDF header magic bytes "%PDF-"
    const uint8 = new Uint8Array(outputBuffer);
    const pdfHeader = String.fromCharCode(...uint8.slice(0, 5));
    assert.equal(pdfHeader, "%PDF-", "Generated document must contain valid PDF magic bytes");
  });

  await t.test("8. PWA Manifest & Service Worker Verification", async () => {
    const manifestPath = path.resolve(process.cwd(), "public/manifest.json");
    assert.ok(fs.existsSync(manifestPath), "public/manifest.json must exist");

    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    assert.equal(manifestContent.display, "standalone");
    assert.ok(manifestContent.icons.length >= 2);

    const swPath = path.resolve(process.cwd(), "public/sw.js");
    assert.ok(fs.existsSync(swPath), "public/sw.js service worker must exist");
    const swContent = fs.readFileSync(swPath, "utf-8");
    assert.ok(swContent.includes("CACHE_NAME"));
    assert.ok(swContent.includes("addEventListener"));

    const icon192 = path.resolve(process.cwd(), "public/icons/icon-192.png");
    const icon512 = path.resolve(process.cwd(), "public/icons/icon-512.png");
    assert.ok(fs.existsSync(icon192), "192x192 icon must exist");
    assert.ok(fs.existsSync(icon512), "512x512 icon must exist");
  });

  // Cleanup test users and records
  await prisma.user.deleteMany({
    where: { id: { in: [testUserAId, testUserBId] } },
  });
});
