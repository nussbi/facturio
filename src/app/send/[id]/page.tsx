"use client";

import { useState } from "react";

export default function SendPage({ params }: { params: Promise<{ id: string }> }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [id, setId] = useState<string | null>(null);

  const handleSend = async () => {
    if (!id) return;
    try {
      setStatus("Sending…");
      const res = await fetch(`/api/send/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setStatus("Document sent for signature!");
    } catch (err) {
      setStatus(err.message || "Could not send");
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a", marginBottom: 8 }}>Send for signature</h1>
      <p style={{ color: "#64748b", marginBottom: 24 }}>Enter the recipient's email address</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input
          type="email"
          placeholder="recipient@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ flex: 1, padding: "12px 16px", border: "1px solid #cbd5e1", borderRadius: 10, fontSize: "1rem" }}
        />
        <button onClick={handleSend} disabled={!email || status.startsWith("Sending")} style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: "linear-gradient(100deg, #4f46e5, #2563eb, #06b6d4)", color: "white", fontSize: "1rem", fontWeight: "600", cursor: "pointer" }}>Send</button>
      </div>

      {status && <div style={{ color: status.startsWith("Document") ? "#16a34a" : "#dc2626" }}>{status}</div>}

      <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #e5e7eb" }}>
        <a href={`/editor/${id}`} style={{ color: "#2563eb", textDecoration: "none" }}>← Back to editor</a>
      </div>
    </div>
  );
}