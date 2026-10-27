import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.customColumn.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Column not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { name, type, options, required, order } = body;
    const validTypes = ["TEXT", "NUMBER", "DATE", "SELECT"];
    if (name !== undefined && (typeof name !== "string" || !name.trim() || name.trim().length > 80)) {
      return NextResponse.json({ error: "Column display name is invalid." }, { status: 400 });
    }
    if (type !== undefined && (typeof type !== "string" || !validTypes.includes(type.toUpperCase()))) {
      return NextResponse.json({ error: "Column type is invalid." }, { status: 400 });
    }
    if (order !== undefined && (!Number.isInteger(Number(order)) || Number(order) < 0 || Number(order) > 1000)) {
      return NextResponse.json({ error: "Column order is invalid." }, { status: 400 });
    }

    let optionsStr = existing.options;
    if (options !== undefined) {
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

    const updated = await prisma.customColumn.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        type: type !== undefined ? type.toUpperCase() : existing.type,
        options: optionsStr,
        required: required !== undefined ? Boolean(required) : existing.required,
        order: order !== undefined ? Number(order) : existing.order,
      },
    });

    return NextResponse.json({ success: true, column: updated });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update column";
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Failed to update custom column." : errorMsg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.customColumn.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Column not found" }, { status: 404 });
  }

  // Safe soft delete to retain historical record values
  await prisma.customColumn.update({
    where: { id },
    data: { isDeleted: true },
  });

  return NextResponse.json({ success: true });
}
