import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const columns = await prisma.customColumn.findMany({
    where: { userId: session.user.id, isDeleted: false },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ columns });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, type, options, required } = body;

    if (typeof name !== "string" || !name.trim() || name.trim().length > 80) {
      return NextResponse.json({ error: "Column display name is required." }, { status: 400 });
    }

    const validTypes = ["TEXT", "NUMBER", "DATE", "SELECT"];
    const colType = typeof type === "string" ? type.toUpperCase() : "TEXT";
    if (!validTypes.includes(colType)) {
      return NextResponse.json({ error: "Invalid column type." }, { status: 400 });
    }

    // Generate safe key/slug from name
    const sanitizedKey = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 32);

    const existingCount = await prisma.customColumn.count({
      where: { userId: session.user.id },
    });

    const key = sanitizedKey || `custom_${existingCount + 1}`;

    // Options array check for select
    let optionsStr: string | null = null;
    if (colType === "SELECT") {
      if (Array.isArray(options)) {
        if (options.length > 50 || options.some((option) => typeof option !== "string" || option.trim().length > 80)) {
          return NextResponse.json({ error: "Select options are invalid." }, { status: 400 });
        }
        optionsStr = JSON.stringify(options.map((option) => option.trim()).filter(Boolean));
      } else if (typeof options === "string") {
        const parsedOptions = options.split(",").map((option) => option.trim()).filter(Boolean);
        if (parsedOptions.length > 50 || parsedOptions.some((option) => option.length > 80)) {
          return NextResponse.json({ error: "Select options are invalid." }, { status: 400 });
        }
        optionsStr = JSON.stringify(parsedOptions);
      }
    }

    const column = await prisma.customColumn.upsert({
      where: {
        userId_key: {
          userId: session.user.id,
          key,
        },
      },
      create: {
        userId: session.user.id,
        key,
        name: name.trim(),
        type: colType,
        options: optionsStr,
        required: Boolean(required),
        order: existingCount,
        isDeleted: false,
      },
      update: {
        name: name.trim(),
        type: colType,
        options: optionsStr,
        required: Boolean(required),
        isDeleted: false,
      },
    });

    return NextResponse.json({ success: true, column }, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create custom column";
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Failed to create custom column." : errorMsg }, { status: 500 });
  }
}
