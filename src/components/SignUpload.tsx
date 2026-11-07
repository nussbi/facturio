"use client";

import { useState } from "react";

export default function SignUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      alert("Only PDF files are supported.");
      return;
    }
    if (f.size > 12 * 1024 * 1024) {
      alert("File too large. Maximum 12 MB.");
      return;
    }
    setFile(f);
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 style={{ fontSize: "2rem", fontWeight: "700", color: "#0f172a" }}>Sign Documents</h1>
      <p style={{ color: "#64748b" }}>Upload any PDF, add signature fields, and send it for signature.</p>

      <div className="f-card mt-8 p-6 sm:p-8">
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#0f172a", marginBottom: 16 }}>1. Upload your PDF</h2>
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFile}
          style={{ width: "100%", padding: 12, border: "2px dashed #cbd5e1", borderRadius: 10, background: "#f8fafc", cursor: "pointer" }}
        />
        {file && (
          <div style={{ marginTop: 16, padding: 16, background: "#f0f9ff", borderRadius: 10, border: "1px solid #0ea5e9" }}>
            <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "#0f172a", marginBottom: 4 }}>
              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          </div>
        )}
        <button
          style={{
            marginTop: 8,
            padding: "10px 24px",
            borderRadius: 10,
            border: "none",
            background: file ? "linear-gradient(100deg, #4f46e5, #2563eb, #06b6d4)" : "#94a3b8",
            color: "white",
            fontSize: "1rem",
            fontWeight: "600",
            cursor: file ? "pointer" : "not-allowed",
          }}
          disabled={!file}
          onClick={async () => {
            if (!file) return;
            setStatus("Uploading document…");
            try {
              const form = new FormData();
              form.append("file", file);
              const res = await fetch("/api/upload", { method: "POST", body: form });
              if (!res.ok) throw new Error("Upload failed");
              const data = await res.json();
              window.location.href = `/editor/${data.id}`;
            } catch (err) {
              alert(err instanceof Error ? err.message : "Upload failed");
              setStatus("");
            }
          }}
        >
          Continue to editor
        </button>
      </div>
    </main>
  );
}