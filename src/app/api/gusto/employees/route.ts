/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function supabase() {
  return createClient();
}

async function refresh(access: { refresh_token: string }) {
  const OAUTH_BASE = process.env.GUSTO_OAUTH_BASE!;
  const body = {
    client_id: process.env.GUSTO_CLIENT_ID!,
    client_secret: process.env.GUSTO_CLIENT_SECRET!,
    redirect_uri: process.env.GUSTO_REDIRECT_URI!,
    refresh_token: access.refresh_token,
    grant_type: "refresh_token",
  };
  const r = await fetch(`${OAUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Refresh failed: ${r.status}`);
  return r.json() as Promise<{ access_token:string; refresh_token:string; expires_in:number }>;
}

export async function GET() {
  // identify current user
  const sb = supabase();
  const user = (await sb.auth.getUser()).data.user;
  console.log(await sb.auth.getUser())
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // load tokens
  const row = await sb.from("gusto_connections").select("*").eq("user_id", user.id).maybeSingle();
  if (row.error || !row.data) return NextResponse.json({ employees: [] }); // not connected yet
  let { access_token, refresh_token, expires_at, company_id } = row.data as any;

  // refresh if expiring
  if (new Date(expires_at).getTime() <= Date.now()) {
    const nt = await refresh({ refresh_token });
    access_token = nt.access_token;
    refresh_token = nt.refresh_token;
    const newExpiresAt = new Date(Date.now() + (nt.expires_in - 60) * 1000).toISOString();
    await sb.from("gusto_connections").update({
      access_token, refresh_token, expires_at: newExpiresAt, updated_at: new Date().toISOString()
    }).eq("user_id", user.id);
  }

  // If we do not have company_id yet, ask token_info once (optional)
  if (!company_id) {
    const API_BASE = process.env.GUSTO_API_BASE!;
    const ver = process.env.GUSTO_API_VERSION;
    const rInfo = await fetch(`${API_BASE}/v1/token_info`, {
      headers: { Authorization: `Bearer ${access_token}`, Accept: "application/json", ...(ver ? { "X-Gusto-API-Version": ver } : {}) }
    });
    const info = await rInfo.json();
    company_id = info.company_uuid || info.company_id || company_id;
    if (company_id) {
      await sb.from("gusto_connections").update({ company_id }).eq("user_id", user.id);
    }
  }

  if (!company_id) {
    return NextResponse.json({ error: "No company bound to token yet" }, { status: 400 });
  }

  // Fetch employees
  const API_BASE = process.env.GUSTO_API_BASE!;
  const ver = process.env.GUSTO_API_VERSION;
  const res = await fetch(`${API_BASE}/v1/companies/${company_id}/employees?per=25`, {
    headers: { Authorization: `Bearer ${access_token}`, Accept: "application/json", ...(ver ? { "X-Gusto-API-Version": ver } : {}) },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: `Employees call failed: ${res.status}` }, { status: 500 });
  }

  const employees = await res.json();
  return NextResponse.json({ employees });
}
