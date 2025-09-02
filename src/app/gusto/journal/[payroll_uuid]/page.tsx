/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";

export default function Journal({ params }: { params: { payroll_uuid: string } }) {
  const [rows, setRows] = useState<any[]>([]);
  const [checkDate, setCheckDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await fetch(`/api/gusto/journal/${params.payroll_uuid}`);
      const js = await r.json();
      setRows(js.rows || []);
      setCheckDate(js.check_date || null);
      setLoading(false);
    })();
  }, [params.payroll_uuid]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Journal Entry #Gusto</h1>

      <div className="flex gap-2 items-center">
        <label className="text-sm text-gray-600">Journal date</label>
        <input
          type="date"
          defaultValue={checkDate ?? undefined}
          className="border rounded px-2 py-1"
        />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-500">Journal no.</span>
          <input defaultValue="Gusto" className="border rounded px-2 py-1 w-40" />
        </div>
      </div>

      <div className="overflow-auto border rounded">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 w-10">#</th>
              <th className="text-left px-3 py-2">ACCOUNT</th>
              <th className="text-right px-3 py-2">DEBITS</th>
              <th className="text-right px-3 py-2">CREDITS</th>
              <th className="text-left px-3 py-2">DESCRIPTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center">Generating GL report…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center">No lines</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="px-3 py-2">{r.account}</td>
                  <td className="px-3 py-2 text-right">{r.debit ? r.debit.toLocaleString() : ""}</td>
                  <td className="px-3 py-2 text-right">{r.credit ? r.credit.toLocaleString() : ""}</td>
                  <td className="px-3 py-2">{r.description}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
