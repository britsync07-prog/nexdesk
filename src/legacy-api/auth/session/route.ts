import { NextRequest, NextResponse } from "next/server";
import { getSession, createSession, getOrCreateDemoUser } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user: session.user });
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production" || process.env.ENABLE_DEMO_MODE !== "true") {
    return NextResponse.json({ error: "Demo mode is disabled." }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email || "supervisor@factory.local";
    const name = body.name || "Alex Vance (Supervisor)";

    const user = await getOrCreateDemoUser(email, name);
    await createSession(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to create session";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
