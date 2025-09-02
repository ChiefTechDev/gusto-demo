export async function gustoFetch(path: string, accessToken: string, init?: RequestInit) {
  const base = process.env.GUSTO_API_BASE!.replace(/\/$/, "");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": init?.body ? "application/json" : "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Gusto ${res.status}: ${await res.text()}`);
  return res.json();
}
