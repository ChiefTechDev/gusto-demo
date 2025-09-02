import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function tokenInfo(accessToken: string) {
  const API_BASE = process.env.GUSTO_API_BASE!;
  const ver = process.env.GUSTO_API_VERSION;
  const r = await fetch(`${API_BASE}/v1/token_info`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...(ver ? { "X-Gusto-API-Version": ver } : {}),
    },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`token_info failed ${r.status}`);
  return r.json();
}

export async function GET() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data, error } = await sb
    .from("gusto_connections")
    .select("access_token, company_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ company: null });

  const info = await tokenInfo(data.access_token);
  return NextResponse.json({ company: { token_info: info, company_id: data.company_id ?? (info.company_uuid || info.company_id || null) } });
}