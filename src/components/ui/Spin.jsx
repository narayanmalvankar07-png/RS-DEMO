import { useState, useEffect } from "react";
import { T } from "../../config/constants.js";

function Spin({ size = 42, dk = false, msg = "", inline = false, logo = false }) {
  const th = T(dk);
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (inline) {
    return (
      <div style={{ display: "inline-flex", width: size, height: size, position: "relative", flexShrink: 0 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#6366f1", borderRightColor: "#6366f155", animation: "spin 0.85s cubic-bezier(0.5,0,0.5,1) infinite" }} />
      </div>
    );
  }

  // Pre-generate random noise dots representing "noise filtering"
  const noiseDots = Array.from({ length: 12 }).map((_, i) => {
    const angle = (i * 360) / 12 + (i % 2 === 0 ? 15 : -10);
    const distance = 55 + (i % 3) * 10;
    const delay = -(i * 0.15);
    const duration = 1.6 + (i % 2) * 0.4;
    return { angle, distance, delay, duration };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: "40px 20px", position: "relative", minHeight: 220, width: "100%", boxSizing: "border-box" }}>
      <style>{`
        @keyframes radarExpand {
          0% { transform: scale(0.35); opacity: 0.95; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes pulseCore {
          0%, 100% { transform: scale(0.92); box-shadow: 0 0 16px rgba(99,102,241,0.55), inset 0 0 8px rgba(255,255,255,0.2); }
          50% { transform: scale(1.08); box-shadow: 0 0 36px rgba(99,102,241,0.85), inset 0 0 12px rgba(255,255,255,0.4); }
        }
        @keyframes spinReticle {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes noiseAbsorb {
          0% { transform: rotate(var(--angle)) translateX(var(--distance)) scale(1.2); opacity: 0; }
          20% { opacity: 0.85; }
          80% { opacity: 0.6; }
          100% { transform: rotate(var(--angle)) translateX(12px) scale(0.25); opacity: 0; }
        }
        @keyframes signalFlowPath {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -120; }
        }
        .rs-radar-wave {
          position: absolute;
          border-radius: 50%;
          border: 1.5px solid ${dk ? "rgba(99,102,241,0.18)" : "rgba(99,102,241,0.12)"};
          animation: radarExpand 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
      `}</style>

      <div style={{ position: "relative", width: 140, height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
        
        {/* Radar Expanding Signal Waves */}
        <div className="rs-radar-wave" style={{ width: 120, height: 120, animationDelay: "0s" }} />
        <div className="rs-radar-wave" style={{ width: 120, height: 120, animationDelay: "0.8s" }} />
        <div className="rs-radar-wave" style={{ width: 120, height: 120, animationDelay: "1.6s" }} />

        {/* Rotating Outer HUD Reticle */}
        <div
          style={{
            position: "absolute",
            width: 96,
            height: 96,
            borderRadius: "50%",
            border: `1.5px dashed ${dk ? "rgba(139,92,246,0.32)" : "rgba(139,92,246,0.22)"}`,
            animation: "spinReticle 10s linear infinite"
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 82,
            height: 82,
            borderRadius: "50%",
            border: `1px dotted ${dk ? "rgba(34,211,238,0.25)" : "rgba(34,211,238,0.18)"}`,
            animation: "spinReticle 6s linear infinite reverse"
          }}
        />

        {/* Orbiting / Incoming Noise Particles getting filtered */}
        {noiseDots.map((d, idx) => (
          <div
            key={idx}
            style={{
              position: "absolute",
              width: 3.5,
              height: 3.5,
              borderRadius: "50%",
              background: idx % 3 === 0 ? "#22d3ee" : idx % 3 === 1 ? "#8b5cf6" : "#6366f1",
              opacity: 0,
              left: "50%",
              top: "50%",
              marginLeft: -1.75,
              marginTop: -1.75,
              animation: "noiseAbsorb var(--duration) cubic-bezier(0.25, 1, 0.5, 1) infinite",
              animationDelay: `${d.delay}s`,
              "--angle": `${d.angle}deg`,
              "--distance": `${d.distance}px`,
              "--duration": `${d.duration}s`
            }}
          />
        ))}

        {/* Central Pulse Signal Core */}
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "pulseCore 2s ease-in-out infinite",
            zIndex: 5,
            border: dk ? "2px solid rgba(255,255,255,0.08)" : "2px solid rgba(255,255,255,0.9)"
          }}
        >
          {/* Inner aligned clean signal core */}
          {logo ? (
            <div style={{ width: 24, height: 24, borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 10px rgba(255,255,255,0.8)" }}>
              <img src="/logo.jpeg" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ) : (
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "0 0 10px #ffffff, 0 0 20px #6366f1" }} />
          )}
        </div>

        {/* Live Clean Waveform Lines (representing stabilized signals) */}
        <svg
          style={{
            position: "absolute",
            width: 140,
            height: 140,
            pointerEvents: "none",
            zIndex: 4
          }}
          viewBox="0 0 100 100"
        >
          {/* Clean Signal Wave 1 (Cyan) */}
          <path
            d="M 12 50 C 25 32, 28 32, 40 50 C 52 68, 55 68, 68 50 C 80 32, 83 32, 95 50"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="1.2"
            strokeDasharray="6 4"
            style={{
              opacity: 0.45,
              animation: "signalFlowPath 3s linear infinite"
            }}
          />
          {/* Clean Signal Wave 2 (Violet) */}
          <path
            d="M 5 50 C 18 68, 21 68, 35 50 C 48 32, 51 32, 65 50 C 78 68, 81 68, 95 50"
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="1.5"
            style={{
              opacity: 0.55,
              strokeDasharray: "120",
              animation: "signalFlowPath 2.2s linear infinite"
            }}
          />
        </svg>
      </div>

      {msg && (
        <span
          style={{
            fontSize: 11,
            color: dk ? "rgba(165, 180, 252, 0.8)" : "rgba(79, 70, 229, 0.95)",
            fontWeight: 800,
            letterSpacing: "1.8px",
            textTransform: "uppercase",
            fontFamily: "monospace",
            animation: "pulse 1.8s ease-in-out infinite",
            textAlign: "center",
            marginTop: 4,
            textShadow: dk ? "0 0 8px rgba(99,102,241,0.2)" : "none"
          }}
        >
          {msg}
        </span>
      )}
    </div>
  );
}

export default Spin;
