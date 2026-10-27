import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { prisma } from "./prisma";

const COOKIE_NAME = "shiftlog_session";
const OAUTH_STATE_COOKIE_NAME = "shiftlog_oauth_state";
const SESSION_SECRET = process.env.SESSION_SECRET;

function getSessionSecret(): string {
  if (!SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be configured.");
  }
  if (SESSION_SECRET.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters.");
  }
  return SESSION_SECRET;
}

const SECRET_KEY = new TextEncoder().encode(getSessionSecret());

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  googleId: string | null;
}

export async function createSession(userId: string): Promise<string> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET_KEY);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return token;
}

export async function getSession(): Promise<{ user: SessionUser } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET_KEY);
    const userId = payload.sub as string;
    if (!userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        googleId: true,
      },
    });

    if (!user) return null;

    return { user };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function createOAuthState(): Promise<string> {
  const state = randomBytes(32).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  return state;
}

export async function consumeOAuthState(state: string | null): Promise<boolean> {
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(OAUTH_STATE_COOKIE_NAME)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE_NAME);
  return Boolean(state && expectedState && state === expectedState);
}

/**
 * Creates or gets a demo/test supervisor account for local testing when
 * Google OAuth credentials are not yet configured.
 */
export async function getOrCreateDemoUser(email = "supervisor@factory.local", name = "Alex Vance (Supervisor)") {
  if (process.env.NODE_ENV === "production" || process.env.ENABLE_DEMO_MODE !== "true") {
    throw new Error("Demo mode is disabled.");
  }
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name,
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
        googleId: "demo_google_id_" + Math.random().toString(36).substring(7),
        integration: {
          create: {
            spreadsheetName: "ShiftLog Records",
            sheetTabName: "Records",
            syncStatus: "idle",
          },
        },
      },
    });
  }

  return user;
}
