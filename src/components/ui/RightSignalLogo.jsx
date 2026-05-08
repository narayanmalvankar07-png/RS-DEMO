import { T } from '../../config/constants.js';

export default function RightSignalLogo({ size = 32, showText = true, dk = false }) {
  const th = T(dk);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: size, height: size, borderRadius: size * 0.28, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 14px rgba(59,130,246,.35)", flexShrink: 0 }}>
        <span style={{ color: "#fff", fontWeight: 900, fontSize: size * 0.56, lineHeight: 1 }}>R</span>
      </div>
      {showText && (
        <div>
          <div style={{ fontWeight: 800, fontSize: size * 0.47, color: th.txt, lineHeight: 1, letterSpacing: "-0.3px" }}>RIGHTSIGNAL</div>
          <div style={{ fontSize: size * 0.22, color: th.txt3, fontWeight: 600, letterSpacing: 0.5 }}>Signal Over Noise</div>
        </div>
      )}
    </div>
  );
}
