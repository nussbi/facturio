"use client";

import { useState, useEffect } from "react";

export default function PortalShareButton({ contactId }: { contactId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasExistingShare, setHasExistingShare] = useState(false);

  // Fetch existing portal link on mount
  useEffect(() => {
    let active = true;
    setUrl(null);
    setHasExistingShare(false);
    setCopied(false);
    setError("");
    (async () => {
      try {
        const res = await fetch(`/app/api/contacts/${encodeURIComponent(contactId)}/portal-share`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!active) return;
        if (res.ok) {
          const data = await res.json().catch(() => ({ url: null }));
          if (data.url) setUrl(data.url);
          setHasExistingShare(Boolean(data.hasExistingShare));
        }
      } catch {
        // ignore fetch errors
      }
    })();
    return () => { active = false; };
  }, [contactId]);

  async function createLink() {
    if ((hasExistingShare || url) && !window.confirm("Replace the customer portal link? The previous link will stop working.")) return;
    setBusy(true);
    setError("");
    setCopied(false);
    try {
      const response = await fetch(`/app/api/contacts/${encodeURIComponent(contactId)}/portal-share`, {
        method: "POST",
        credentials: "include",
      });
      const text = await response.text();
      let body: { url?: string; error?: string } = {};
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = { error: "Invalid response from server" };
      }
      if (!response.ok) throw new Error(body.error || "Could not create portal link");
      if (body.url) {
        setUrl(body.url);
        setHasExistingShare(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create portal link");
    } finally {
      setBusy(false);
    }
  }

  async function copyToClipboard() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={createLink}
        disabled={busy}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? "Creating…" : hasExistingShare ? "Replace customer portal link" : "Create customer portal link"}
      </button>
      {hasExistingShare && !url && <p className="text-xs text-gray-600">An active private link exists but could not be loaded. Reload this page before replacing it.</p>}
      {url && (
        <div className="space-y-1">
          <p className="text-xs text-gray-600">
            {copied ? "Link copied." : "Copy this private link. It remains valid until replaced or revoked."}
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              onClick={(e) => e.currentTarget.select()}
              className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-xs"
              aria-label="Customer portal link"
            />
            <button
              onClick={copyToClipboard}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}