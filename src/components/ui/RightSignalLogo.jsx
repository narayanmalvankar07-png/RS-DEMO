import { T } from '../../config/constants.js';

export default function RightSignalLogo({ size = 32, showText = true, dk = false }) {
  const th = T(dk);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <img src="/logo.jpeg" alt="Logo" style={{ width: size, height: size, borderRadius: size * 0.28, objectFit: "contain", flexShrink: 0 }} />
      {showText && (
        <div>
          <div style={{ fontWeight: 800, fontSize: size * 0.47, color: th.txt, lineHeight: 1, letterSpacing: "-0.3px" }}>RIGHTSIGNAL</div>
          <div style={{ fontSize: size * 0.22, color: th.txt3, fontWeight: 600, letterSpacing: 0.5 }}>Signal Over Noise</div>
        </div>
      )}
    </div>
  );
}
