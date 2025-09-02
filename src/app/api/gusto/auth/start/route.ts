import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.GUSTO_API_BASE!.replace(/\/$/, "");
  const params = new URLSearchParams({
    client_id: process.env.GUSTO_CLIENT_ID!,
    redirect_uri: process.env.GUSTO_REDIRECT_URI!,
    response_type: "code",
    state: crypto.randomUUID(),
    scope: process.env.GUSTO_SCOPES!,
  });
  const url = `${base.replace("api.", "api.")}/oauth/authorize?${params.toString()}`;
  return NextResponse.redirect(url);
}