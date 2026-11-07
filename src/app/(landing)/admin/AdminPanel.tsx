"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function AdminPanel() {
  const [org, setOrg] = useState<{ defaultVat?: number } | null>(null);
  const [vatInput, setVatInput] = useState<string>("");
  const [output, setOutput] = useState<string>("");

  async function refresh() {
    try {
      const o = await fetchJson<{ org?: { defaultVat?: number } }>("/api/org");
      setOrg(o.org || null);
      setVatInput(o.org?.defaultVat != null ? String(o.org.defaultVat) : "");
    } catch (e: unknown) {
      setOutput(`Error loading org: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  useEffect(() => { refresh(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin</h1>
        <Button variant="ghost" onClick={refresh}>Refresh</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <div className="text-xs text-gray-600 mb-1">Default VAT (%)</div>
              <input className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 bg-white w-full" placeholder="e.g. 8.1" value={vatInput} onChange={e=>setVatInput(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Button size="sm" onClick={async()=>{
                const body: { defaultVat?: number | null } = { ...(org||{}), defaultVat: vatInput? parseFloat(vatInput): null };
                const res = await fetch('/api/org', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) });
                setOutput(res.ok? 'Org updated' : await res.text());
                await refresh();
              }}>Save</Button>
            </div>
          </div>
          {output && <div className="mt-3 text-sm text-gray-600">{output}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
