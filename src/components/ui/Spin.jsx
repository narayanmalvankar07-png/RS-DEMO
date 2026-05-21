function Spin({ size = 42, dk = false, msg = "", inline = false }) {
  if (inline) {
    return (
      <div style={{ display: "inline-flex", width: size, height: size, position: "relative", flexShrink: 0 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#6366f1", borderRightColor: "#6366f155", animation: "spin 0.85s cubic-bezier(0.5,0,0.5,1) infinite" }} />
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 48 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <div style={{ position: "absolute", inset: "28%", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.95), rgba(139,92,246,0.5))", animation: "pulse 1.8s ease-in-out infinite" }} />
        <div style={{ position: "absolute", inset: "10%", borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#8b5cf6", borderLeftColor: "#8b5cf655", animation: "spin 0.72s linear infinite reverse" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2.5px solid transparent", borderTopColor: "#6366f1", borderRightColor: "#6366f150", animation: "spin 1.15s cubic-bezier(0.5,0,0.5,1) infinite" }} />
      </div>
      {msg && <span style={{ fontSize: 12, color: dk ? "rgba(140,170,220,0.7)" : "rgba(71,85,105,0.75)", fontWeight: 500, letterSpacing: "0.5px" }}>{msg}</span>}
    </div>
  );
}

export default Spin;
