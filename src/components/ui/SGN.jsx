// src/components/ui/SGN.jsx

function SGN({ n, size = "sm", pulse = false }) {
  const sizes = { sm: { f: 10, p: "1px 6px" }, md: { f: 11, p: "3px 8px" }, lg: { f: 14, p: "5px 12px" } };
  const s = sizes[size];
  if (!n) return null;
  return (
    <span style={{ background: "linear-gradient(135deg,#78350f,#d97706)", color: "#fff", fontSize: s.f, fontWeight: 800, padding: s.p, borderRadius: 99, display: "inline-flex", alignItems: "center", gap: 3, animation: pulse ? "glow 2s ease-in-out infinite" : "none", flexShrink: 0 }}>
      ◈ {n} SGN
    </span>
  );
}

export default SGN;