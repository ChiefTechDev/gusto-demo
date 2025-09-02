/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";

export default function GustoPage() {
  const [data, setData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/gusto/employees")
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d.employees ?? []);
        console.log(d)
      })
      .catch(e => setError(String(e)));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <a
          href="/api/gusto/auth/start"
          className="rounded-lg border px-4 py-2 hover:bg-gray-50"
        >
          Connect Gusto
        </a>
        <button
          className="rounded-lg border px-4 py-2 hover:bg-gray-50"
          onClick={() => location.reload()}
        >
          Refresh
        </button>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      {data && (
        <div className="overflow-auto border rounded-lg">
          <table className="min-w-[600px] text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-2">Name</th>
                <th className="p-2">Email</th>
                <th className="p-2">Employee Code</th>
                <th className="p-2">Current Employment Status</th>
                <th className="p-2">Department</th>
                <th className="p-2">Date of Birth</th>
                <th className="p-2">Title</th>
                <th className="p-2">Rate</th>
                <th className="p-2">Hire Date</th>
                <th className="p-2">Payment Method</th>
                <th className="p-2">Onboarding Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((e: any) => (
                <tr key={e.id} className="border-t">
                  <td className="p-2">{e.first_name} {e.last_name}</td>
                  <td className="p-2">{e.work_email ?? e.email ?? "—"}</td>
                  <td className="p-2">{e.employee_code || "—"}</td>
                  <td className="p-2">{e.current_employment_status || "—"}</td>
                  <td className="p-2">{e.department || "—"}</td>
                  <td className="p-2">{e.date_of_birth || "—"}</td>
                  <td className="p-2">{e.jobs[0]?.title || "—"}</td>
                  <td className="p-2">{(e.jobs[0]?.rate && e.jobs[0]?.payment_unit) ? `${e.jobs[0].rate}/${e.jobs[0].payment_unit}` : "—"}</td>
                  <td className="p-2">{e.jobs[0]?.hire_date || "—"}</td>
                  <td className="p-2">{e?.payment_method || "—"}</td>
                  <td className="p-2">{e.onboarding_status || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
