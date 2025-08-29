import { NextResponse } from "next/server";

export async function GET() {
  const OAUTH_BASE = process.env.GUSTO_OAUTH_BASE!;
  const redirectUri = process.env.GUSTO_REDIRECT_URI!;
  const clientId = process.env.GUSTO_CLIENT_ID!;
  const state = crypto.randomUUID();

  const url = new URL(`${OAUTH_BASE}/oauth/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString(), { status: 302 });
  // store state in a short-lived, httpOnly cookie
  res.cookies.set("gusto_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: 10 * 60, // 10 minutes
    path: "/",
  });
  return res;
}
