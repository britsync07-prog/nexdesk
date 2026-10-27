import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/google";
import { createOAuthState } from "@/lib/auth";

export async function GET() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      {
        configured: false,
        message: "Google OAuth credentials not configured in environment.",
        url: null,
        demoEnabled: process.env.NODE_ENV !== "production" && process.env.ENABLE_DEMO_MODE === "true",
      },
      { status: 200 }
    );
  }

  const state = await createOAuthState();
  const url = getAuthUrl(state);
  return NextResponse.json({ configured: true, url, demoEnabled: process.env.NODE_ENV !== "production" && process.env.ENABLE_DEMO_MODE === "true" });
}
