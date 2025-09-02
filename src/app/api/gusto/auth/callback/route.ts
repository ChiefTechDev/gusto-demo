import { NextRequest, NextResponse } from "next/server";
// import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

function supabase() {
  return createClient();
}

async function exchangeCodeForToken(code: string) {
  const OAUTH_BASE = process.env.GUSTO_API_BASE!;
  const body = {
    client_id: process.env.GUSTO_CLIENT_ID!,
    client_secret: process.env.GUSTO_CLIENT_SECRET!,
    redirect_uri: process.env.GUSTO_REDIRECT_URI!,
    code,
    grant_type: "authorization_code",
  };
  const r = await fetch(`${OAUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Token exchange failed: ${r.status}`);
  return r.json() as Promise<{ access_token:string; refresh_token:string; expires_in:number }>;
}

async function fetchTokenInfo(accessToken: string) {
  const API_BASE = process.env.GUSTO_API_BASE!;
  const ver = process.env.GUSTO_API_VERSION;
  const r = await fetch(`${API_BASE}/v1/token_info`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(ver ? { "X-Gusto-API-Version": ver } : {}),
    },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`token_info failed: ${r.status}`);
  return r.json(); // typically includes company/resource info
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sb = supabase();
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json({ error: "Invalid OAuth state or missing code" }, { status: 400 });
  }

  // TODO: identify your signed-in user id
  const userId = (await sb.auth.getUser()).data.user?.id;
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const token = await exchangeCodeForToken(code);
  const info = await fetchTokenInfo(token.access_token);

  // Try to pick up company identifier (name varies in docs; often company_uuid or company_id)
  const companyId = info.resource.uuid || info.company_id || info.resource_id;

  const expiresAt = new Date(Date.now() + (token.expires_in - 60) * 1000).toISOString();
  // Upsert by (user_id)
  const { error } = await sb
    .from("gusto_connections")
    .upsert({
      user_id: userId,
      company_id: companyId ?? null,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Redirect to a simple UI page
  return NextResponse.redirect(new URL("/gusto", req.nextUrl.origin));
}
