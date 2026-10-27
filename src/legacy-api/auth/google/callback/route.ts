import { NextRequest, NextResponse } from "next/server";
import { getOAuth2Client } from "@/lib/google";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { consumeOAuthState, createSession } from "@/lib/auth";
import { encryptSecret } from "@/lib/secrets";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  if (process.env.NODE_ENV === "production" && (!process.env.NEXT_PUBLIC_APP_URL || !appBaseUrl.startsWith("https://"))) {
    return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL must be an HTTPS production URL." }, { status: 500 });
  }

  if (error || !code) {
    return NextResponse.redirect(
      `${appBaseUrl}/login?error=${encodeURIComponent(error || "Authorization declined")}`
    );
  }

  if (!(await consumeOAuthState(state))) {
    return NextResponse.redirect(
      `${appBaseUrl}/login?error=${encodeURIComponent("Invalid OAuth state. Start sign-in again.")}`
    );
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch user profile from Google
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    if (!profile.email) {
      return NextResponse.redirect(`${appBaseUrl}/login?error=Google account has no email`);
    }

    // Find or create user in database
    let user = await prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name || null,
          image: profile.picture || null,
          googleId: profile.id || null,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: profile.name || user.name,
          image: profile.picture || user.image,
          googleId: profile.id || user.googleId,
        },
      });
    }

    // Store or update Google Integration tokens
    await prisma.googleIntegration.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        accessToken: tokens.access_token ? encryptSecret(tokens.access_token) : null,
        refreshToken: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scopes: tokens.scope || null,
        syncStatus: "idle",
      },
      update: {
        accessToken: tokens.access_token ? encryptSecret(tokens.access_token) : undefined,
        refreshToken: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : undefined,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        scopes: tokens.scope || undefined,
      },
    });

    // Establish secure session
    await createSession(user.id);

    return NextResponse.redirect(`${appBaseUrl}/dashboard?google_connected=true`);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "OAuth callback error";
    const message = process.env.NODE_ENV === "production" ? "Google sign-in failed. Try again." : errorMsg;
    return NextResponse.redirect(`${appBaseUrl}/login?error=${encodeURIComponent(message)}`);
  }
}
