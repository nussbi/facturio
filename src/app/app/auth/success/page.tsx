export default function AuthSuccessPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        background: "linear-gradient(135deg,#4F46E5,#2563EB,#06B6D4)",
        color: "#fff",
        textAlign: "center",
        padding: "24px",
      }}
    >
      <div style={{ fontSize: "44px" }}>✓</div>
      <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0 }}>Sign-in complete</h1>
      <p style={{ fontSize: "15px", opacity: 0.9, margin: 0 }}>Returning to the app…</p>
    </div>
  );
}
