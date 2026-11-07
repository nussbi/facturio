import { Metadata } from "next";
import { prisma } from "@/server/db";

export const metadata: Metadata = {
  title: "Editor | Sign Document",
  description: "Place signature fields on your document",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditorPage({ params }: Props) {
  const { id } = await params;

  const envelope = await prisma.signingEnvelope.findUnique({
    where: { id },
    select: { id: true, title: true, originalFileName: true, pageCount: true, status: true },
  });

  if (!envelope) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a" }}>Document not found</h1>
        <a href="/" style={{ color: "#2563eb" }}>← Back to upload</a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #e5e7eb" }}>
        <div className="doc-info">
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0f172a" }}>{envelope.title}</div>
          <div style={{ fontSize: "0.9rem", color: "#64748b", marginTop: 4 }}>{envelope.originalFileName} · {envelope.pageCount} page{envelope.pageCount === 1 ? "" : "s"}</div>
        </div>
        <a href={`/send/${id}`}><button style={{ padding: "10px 24px", borderRadius: 10, border: "1px solid #0ea5e9", background: "white", color: "#2563eb", fontSize: "0.9rem", cursor: "pointer" }}>Continue to send</button></a>
      </div>

      <div style={{ width: "100%", height: "calc(100vh - 160px)", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", position: "relative" }}>
        <iframe 
          src={`/api/upload/${id}/document`} 
          style={{ width: "100%", height: "100%", border: "none" }} 
          allow="fullscreen"
          title="Document preview"
        />
      </div>

      <div style={{ marginTop: 16, textAlign: "center", padding: "16px", background: "#f0f9ff", borderRadius: 10, border: "1px solid #bae6fd" }}>
        <p style={{ margin: "0 0 12px 0", color: "#0369a1", fontSize: "0.9rem" }}>
          Can't see the PDF above? <strong>Mobile browsers don't display PDFs inline.</strong>
        </p>
        <a href={`/api/upload/${id}/document`} target="_blank" rel="noopener noreferrer" style={{ 
          display: "inline-flex", 
          alignItems: "center", 
          gap: 8, 
          padding: "12px 24px", 
          background: "linear-gradient(100deg, #4f46e5, #2563eb, #06b6d4)", 
          color: "white", 
          borderRadius: 10, 
          textDecoration: "none", 
          fontWeight: 600,
          fontSize: "1rem"
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Open PDF in new tab
        </a>
      </div>
    </div>
  );
}