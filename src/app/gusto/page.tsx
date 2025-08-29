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
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((e: any) => (
                <tr key={e.id} className="border-t">
                  <td className="p-2">{e.first_name} {e.last_name}</td>
                  <td className="p-2">{e.work_email ?? e.personal_email ?? "—"}</td>
                  <td className="p-2">{e.status ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
