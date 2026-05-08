// src/components/ui/Av.jsx
import { strColor } from '../../utils/helpers.js';

function Av({ profile = {}, size = 36, bal }) {
  const name = profile.name || "?";
  const ini = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const hue = profile.hue || strColor(name);
  const ring = bal > 0 ? "2px solid #f59e0b" : "none";
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: profile.avatar ? "transparent" : `linear-gradient(135deg,${hue},${hue}99)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.35, color: "#fff", flexShrink: 0, overflow: "hidden", border: ring, boxSizing: "border-box" }}>
      {profile.avatar ? <img src={profile.avatar} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : ini}
    </div>
  );
}

export default Av;