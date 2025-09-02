/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { gustoFetch } from "@/lib/gusto";
import { createClient } from "@/lib/supabase/server";

function supabase() {
  return createClient();
}

async function refresh(access: { refresh_token: string }) {
  const OAUTH_BASE = process.env.GUSTO_API_BASE!;
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

/**
 * Normalizes Gusto GL JSON into rows: {account, debit, credit, description}
 * Gusto's GL JSON can differ a bit by config; this handles common shapes.
 */
function normalizeGL(gl: any) {
  // Common places Gusto puts line items
  const candidates = [
    gl?.journal_entries,
    gl?.entries,
    gl?.lines,
    gl?.data?.journal_entries,
    gl?.report?.journal_entries,
  ].filter(Boolean);
  const raw = candidates[0] || [];

  const rows = raw.map((line: any) => {
    // Account name/number
    const accountName =
      line?.account_name ??
      line?.account?.name ??
      line?.account ??
      "Unknown Account";

    const accountNumber =
      line?.account_number ??
      line?.account?.number ??
      line?.account?.code ??
      null;

    const description =
      line?.description ??
      line?.memo ??
      line?.memo_line ??
      line?.earnings_type ??
      line?.tax_type ??
      "";

    // Amounts can appear in cents or dollars; try both
    const debit =
      typeof line?.debit === "number" ? line.debit :
      typeof line?.debit_amount === "number" ? line.debit_amount :
      typeof line?.debit_cents === "number" ? line.debit_cents / 100 :
      0;

    const credit =
      typeof line?.credit === "number" ? line.credit :
      typeof line?.credit_amount === "number" ? line.credit_amount :
      typeof line?.credit_cents === "number" ? line.credit_cents / 100 :
      0;

    const account =
      accountNumber ? `${accountName} (${accountNumber})` : accountName;

    return { account, debit: +debit.toFixed(2), credit: +credit.toFixed(2), description };
  });

  return rows;
}

async function createGeneralLedger(accessToken: string, payroll_uuid: string) {
  // Kick off the report (aggregation is optional; omit to get flat JE)
  const resp = await gustoFetch(
    `/v1/payrolls/${payroll_uuid}/reports/general_ledger`,
    accessToken,
    { method: "POST", body: JSON.stringify({}) }
  );
  return resp?.request_uuid as string;
}

async function pollReport(accessToken: string, request_uuid: string, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    const meta = await gustoFetch(`/v1/reports/${request_uuid}`, accessToken);
    if (meta?.status === "complete" && meta?.report_url) {
      const r = await fetch(meta.report_url, { cache: "no-store" });
      if (!r.ok) throw new Error(`Report download failed ${r.status}`);
      return await r.json();
    }
    if (meta?.status === "failed") throw new Error("Report generation failed");
    await new Promise(res => setTimeout(res, 1500));
  }
  throw new Error("Report not ready (timeout)");
}

export async function GET(req: NextRequest, { params }: { params: { payroll_uuid: string } }) {
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

  const { payroll_uuid } = params;

  // 1) create + 2) poll + 3) fetch JSON
  const request_uuid = await createGeneralLedger(access_token, payroll_uuid);
  const glJson = await pollReport(access_token, request_uuid);

  // 4) normalize rows
  const rows = normalizeGL(glJson);

  // 5) (optional) persist to Supabase here if you want
  // await saveToSupabase({ company_id, payroll_uuid, json: glJson, rows })

  return NextResponse.json({
    payroll_uuid,
    check_date:
      glJson?.payroll?.check_date ??
      glJson?.metadata?.check_date ??
      glJson?.pay_period?.check_date ??
      null,
    rows,
    raw: glJson, // include raw once while building; remove later
  });
}
