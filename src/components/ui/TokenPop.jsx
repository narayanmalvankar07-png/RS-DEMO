// src/components/ui/TokenPop.jsx
import { useEffect } from "react";

function TokenPop({ amount, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: "fixed", bottom: 32, right: 32, background: "linear-gradient(135deg,#78350f,#d97706)", borderRadius: 16, padding: "16px 24px", zIndex: 9999, boxShadow: "0 8px 30px rgba(245,158,11,.4)", animation: "popIn .4s ease", display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 28 }}>◈</span>
      <div><div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>+{amount} SGN Earned!</div><div style={{ color: "rgba(255,255,255,.7)", fontSize: 12 }}>Signal Token reward</div></div>
    </div>
  );
}

export default TokenPop;