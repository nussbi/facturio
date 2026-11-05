"use client";

import { useState } from "react";

export default function UploadPage() {
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
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "700", color: "#0f172a" }}>Sign Documents</h1>
      <p style={{ color: "#64748b" }}>Upload any PDF, add signature fields, and send it for signature.</p>

      <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 32, marginBottom: 24 }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#0f172a", marginBottom: 16 }}>1. Upload your PDF</h2>
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFile}
          style={{ width: "100%", padding: 12, border: "2px dashed #cbd5e1", borderRadius: 8, background: "#f8fafc", cursor: "pointer" }}
        />
        {file && (
          <div style={{ marginTop: 16, padding: 16, background: "#f0f9ff", borderRadius: 8, border: "1px solid #0ea5e9" }}>
            <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "#0f172a", marginBottom: 4 }}>
              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          </div>
        )}
        <button
          style={{
            marginTop: 8,
            padding: "10px 24px",
            borderRadius: 8,
            border: "none",
            background: file ? "#0ea5e9" : "#94a3b8",
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
              alert(err.message || "Upload failed");
              setStatus("");
            }
          }}
        >
          Continue to editor
        </button>
      </div>
    </div>
  );
}