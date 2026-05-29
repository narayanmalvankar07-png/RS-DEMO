import { useState, useEffect, useMemo } from "react";

function Spin({ size = 42, dk = false, msg = "", inline = false }) {
  if (inline) {
    return (
      <div style={{ display: "inline-flex", width: size, height: size, position: "relative", flexShrink: 0 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#6366f1", borderRightColor: "#6366f155", animation: "spin 0.85s cubic-bezier(0.5,0,0.5,1) infinite" }} />
      </div>
    );
  }

  const rocketSize = Math.max(size, 85);

  const logoSrc = dk ? "/logo.jpeg" : "/logo.png";
  const [processedLogo, setProcessedLogo] = useState(logoSrc);

  useEffect(() => {
    setProcessedLogo(logoSrc);
  }, [logoSrc]);

  useEffect(() => {
    if (inline) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logoSrc;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      let minX = canvas.width;
      let maxX = 0;
      let minY = canvas.height;
      let maxY = 0;
      let found = false;
      
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const idx = (y * canvas.width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          
          // Detect blue/cyan pixels from the central window
          if (a > 50 && b > r + 40 && b > 100) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            found = true;
          }
        }
      }
      
      if (found) {
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const radiusX = (maxX - minX) / 2;
        const radiusY = (maxY - minY) / 2;
        const radius = Math.max(radiusX, radiusY) + 1;
        
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
        
        setProcessedLogo(canvas.toDataURL());
      }
    };
  }, [inline, logoSrc]);

  // Tick timer driving phase transitions (100ms ticks, 120 ticks = 12s cycle)
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const cycleTick = tick % 120;

  // Flight phases
  // Phase 0: DIAGNOSTIC (0-29 T-minus test)
  // Phase 1: LAUNCH THRUST (30-59 Ignition ascent)
  // Phase 2: WARP HYPERSPACE (60-89 Warp speed jump)
  // Phase 3: COSMIC CRUISE (90-119 slipstream hover)
  const phase = useMemo(() => {
    if (cycleTick < 30) return 0;
    if (cycleTick < 60) return 1;
    if (cycleTick < 90) return 2;
    return 3;
  }, [cycleTick]);

  // Pre-generate 3D Star Coordinates to avoid recalculations on render
  const starsData = useMemo(() => {
    return Array.from({ length: 42 }).map((_, i) => {
      const angle = Math.random() * 360;
      const distance = Math.random() * 160 + 130;
      const delay = Math.random() * -2.5;
      const duration = Math.random() * 1.5 + 0.9;
      const opacity = Math.random() * 0.6 + 0.4;
      const colors = ["#6366f1", "#8b5cf6", "#22d3ee", "#38bdf8", "#ffffff"];
      const color = colors[i % colors.length];
      return { angle, distance, delay, duration, opacity, color };
    });
  }, []);

  // Pre-generate organic billowing smoke particles parameters
  const smokePuffs = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => {
      const sx = Math.random() * 10 - 5;
      const dx = sx * 3 + (Math.random() * 32 - 16);
      const delay = i * 0.11;
      const duration = 1.3;
      return { sx, dx, delay, duration };
    });
  }, []);

  // Pre-generate thruster sparks parameters
  const sparksData = useMemo(() => {
    return Array.from({ length: 16 }).map((_, i) => {
      const sx = Math.random() * 12 - 6;
      const dx = sx * 3.5 + (Math.random() * 40 - 20);
      const delay = i * 0.07;
      const duration = 0.7 + Math.random() * 0.3;
      const colors = ["#ff5722", "#ff9800", "#ffeb3b", "#ef4444"];
      const color = colors[i % colors.length];
      return { sx, dx, delay, duration, color };
    });
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "36px 18px",
        position: "relative",
        overflow: "hidden",
        minHeight: 400,
        width: "100%",
        boxSizing: "border-box"
      }}
    >
      {/* Volumetric smoke SVG Filter */}
      <svg style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}>
        <defs>
          <filter id="billow-smoke-filter">
            <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="4" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="16" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <style>{`
        /* ── Perspective Cosmic Cyber Grid ── */
        .rs-cyber-grid-bg {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(99, 102, 241, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.04) 1px, transparent 1px);
          background-size: 24px 24px;
          background-position: center;
          perspective: 250px;
          transform: rotateX(55deg) translateZ(-60px);
          transform-origin: center bottom;
          opacity: 0.6;
          pointer-events: none;
        }

        /* ── 3D Cosmic Starfield Warp ── */
        @keyframes starWarpZoom {
          0% {
            transform: rotate(var(--angle)) translateX(0px) scaleX(0.1) scaleY(1);
            opacity: 0;
          }
          10% { opacity: var(--opacity); }
          85% { opacity: var(--opacity); }
          100% {
            transform: rotate(var(--angle)) translateX(var(--distance)) scaleX(var(--stretch)) scaleY(0.7);
            opacity: 0;
          }
        }
        .rs-warp-star-3d {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 2.5px;
          height: 2.5px;
          border-radius: 99px;
          transform-origin: center left;
          animation: starWarpZoom var(--duration) linear infinite;
          animation-delay: var(--delay);
          --stretch: 2.5;
        }
        .rs-warp-active .rs-warp-star-3d {
          animation-duration: calc(var(--duration) * 0.16) !important;
          --stretch: 24;
        }

        /* ── Holographic HUD Laser Scan ── */
        @keyframes laserScanSweep {
          0% { transform: translateY(-70px); opacity: 0.15; }
          50% { opacity: 0.95; filter: drop-shadow(0 0 6px #22d3ee); }
          100% { transform: translateY(70px); opacity: 0.15; }
        }
        .rs-hud-scanline {
          position: absolute;
          left: 5%;
          width: 90%;
          height: 1.5px;
          background: linear-gradient(90deg, transparent, #22d3ee, #8b5cf6, #22d3ee, transparent);
          z-index: 5;
          pointer-events: none;
          animation: laserScanSweep 2.8s ease-in-out infinite;
        }

        /* ── Chamber Camera Shake ── */
        @keyframes engineShakeLow {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-0.8px, 0.5px) rotate(-0.2deg); }
          50% { transform: translate(0.8px, -0.8px) rotate(0.2deg); }
          75% { transform: translate(-0.5px, -0.5px) rotate(-0.1deg); }
        }
        @keyframes engineShakeHeavy {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          10% { transform: translate(-2px, 1.5px) rotate(-1deg); }
          20% { transform: translate(2px, -1.5px) rotate(1deg); }
          30% { transform: translate(-1.5px, -2px) rotate(-0.8deg); }
          40% { transform: translate(2px, 2px) rotate(0.8deg); }
          50% { transform: translate(-2px, 1px) rotate(-1deg); }
          60% { transform: translate(1.5px, 1.5px) rotate(1deg); }
          70% { transform: translate(-1.5px, -0.8px) rotate(-0.5deg); }
          80% { transform: translate(1px, 2px) rotate(0.8deg); }
          90% { transform: translate(-0.8px, -1.5px) rotate(-0.8deg); }
        }
        .rs-chamber-stabilizer {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .rs-phase-1 .rs-chamber-stabilizer {
          animation: engineShakeLow 0.12s linear infinite;
        }
        .rs-phase-2 .rs-chamber-stabilizer {
          animation: engineShakeHeavy 0.07s linear infinite;
        }

        /* ── Hover Flight Dynamics ── */
        @keyframes hoverStabilizer {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-5px) rotate(-1.5deg); }
          66% { transform: translateY(3px) rotate(1.5deg); }
        }
        .rs-hover-flight {
          animation: hoverStabilizer 3.8s ease-in-out infinite;
          transform-style: preserve-3d;
        }
        .rs-phase-2 .rs-hover-flight {
          transform: scaleY(1.35) scaleX(0.8);
          transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
        }

        /* ── SVG Flickering Plasma Lightning ── */
        @keyframes arcFlickerA {
          0%, 20%, 30%, 80%, 100% { opacity: 0; }
          21%, 25% { opacity: 0.9; }
          22%, 24% { opacity: 0.15; }
          23% { opacity: 0.95; }
        }
        @keyframes arcFlickerB {
          0%, 40%, 50%, 90%, 100% { opacity: 0; }
          41%, 46% { opacity: 0.85; }
          42%, 45% { opacity: 0.1; }
          44% { opacity: 0.9; }
        }
        @keyframes arcFlickerC {
          0%, 65%, 75%, 100% { opacity: 0; }
          66%, 71% { opacity: 0.95; }
          67%, 70% { opacity: 0.2; }
          69% { opacity: 0.95; }
        }
        .rs-plasma-arc-1 { animation: arcFlickerA 1.8s linear infinite; }
        .rs-plasma-arc-2 { animation: arcFlickerB 2.2s linear infinite; }
        .rs-plasma-arc-3 { animation: arcFlickerC 2.6s linear infinite; }

        /* ── Volumetric Organic Billowing Smoke ── */
        @keyframes organicSmokeBillow {
          0% {
            transform: translate(var(--sx), 0) scale(0.15);
            background: rgba(255, 87, 34, 0.85);
            box-shadow: 0 0 12px rgba(255, 87, 34, 0.8);
            opacity: 0.95;
          }
          15% {
            background: rgba(255, 170, 51, 0.8);
            box-shadow: 0 0 20px rgba(255, 170, 51, 0.6);
            opacity: 0.9;
          }
          35% {
            background: rgba(85, 85, 85, 0.7);
            box-shadow: none;
            opacity: 0.65;
          }
          70% {
            background: rgba(40, 40, 40, 0.45);
            opacity: 0.4;
          }
          100% {
            transform: translate(var(--dx), 115px) scale(2.6);
            background: rgba(18, 18, 18, 0);
            opacity: 0;
          }
        }
        .rs-smoke-puff {
          position: absolute;
          width: 25px;
          height: 25px;
          border-radius: 50%;
          animation: organicSmokeBillow var(--duration) cubic-bezier(0.2, 0.6, 0.35, 1) infinite;
          animation-delay: var(--delay);
          transform-origin: center center;
        }

        /* ── Dynamic Sparks ── */
        @keyframes sparkFallPath {
          0% { transform: translate(var(--sx), 0) scale(1.3); opacity: 1; }
          100% { transform: translate(var(--dx), 90px) scale(0); opacity: 0; }
        }
        .rs-ember-spark {
          position: absolute;
          width: 3.5px;
          height: 3.5px;
          border-radius: 50%;
          animation: sparkFallPath var(--duration) linear infinite;
          animation-delay: var(--delay);
          filter: drop-shadow(0 0 3px var(--color));
        }

        /* ── Supersonic Engine Fire & Core ── */
        @keyframes engineFlameOuter {
          0%, 100% { transform: scaleY(1.2) scaleX(1.1); filter: drop-shadow(0 0 16px #ff5722) blur(0.5px); }
          50% { transform: scaleY(0.9) scaleX(0.92); filter: drop-shadow(0 0 9px #ef4444) blur(1.2px); }
        }
        .rs-fire-outer-core {
          animation: engineFlameOuter 0.12s linear infinite;
        }

        @keyframes engineFlameInner {
          0%, 100% { transform: scaleY(1.3) scaleX(1.15); filter: drop-shadow(0 0 12px #22d3ee); }
          50% { transform: scaleY(0.85) scaleX(0.88); filter: drop-shadow(0 0 6px #06b6d4); }
        }
        .rs-fire-inner-core {
          animation: engineFlameInner 0.08s linear infinite;
        }

        /* ── Supersonic Shock Diamonds ── */
        @keyframes diamondPulse {
          0%, 100% { transform: scale(1) rotate(45deg); opacity: 0.95; }
          50% { transform: scale(0.75, 1.25) rotate(45deg); opacity: 0.7; }
        }
        .rs-shock-node {
          width: 8px;
          height: 8px;
          background: linear-gradient(135deg, #ffffff 0%, #22d3ee 60%, #8b5cf6 100%);
          box-shadow: 0 0 8px #22d3ee;
          animation: diamondPulse 0.06s linear infinite;
        }

        /* ── Interactive Force Shield Bubble ── */
        @keyframes shieldWave {
          0%, 100% { opacity: 0.08; transform: scale(1.05); box-shadow: 0 0 10px rgba(34, 211, 238, 0.15) inset, 0 0 5px rgba(34, 211, 238, 0.1); }
          50% { opacity: 0.45; transform: scale(1.12); box-shadow: 0 0 30px rgba(34, 211, 238, 0.45) inset, 0 0 15px rgba(34, 211, 238, 0.3); }
        }
        .rs-forcefield-bubble {
          position: absolute;
          width: ${rocketSize + 40}px;
          height: ${rocketSize + 40}px;
          border-radius: 50%;
          border: 1px solid rgba(34, 211, 238, 0.35);
          background: radial-gradient(circle, transparent 55%, rgba(34, 211, 238, 0.08) 100%);
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.5s ease;
        }
        .rs-phase-3 .rs-forcefield-bubble {
          opacity: 1;
          animation: shieldWave 3.5s ease-in-out infinite;
        }

        /* ── Ambient Nebulae Clouds ── */
        @keyframes nebulaDrift {
          0%, 100% { opacity: 0.15; transform: scale(0.9) translate(0, 0); }
          50% { opacity: 0.4; transform: scale(1.2) translate(15px, -15px); }
        }
        .rs-nebula-gases {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 75% 30%, rgba(139, 92, 246, 0.12) 0%, transparent 50%),
                      radial-gradient(circle at 20% 70%, rgba(34, 211, 238, 0.1) 0%, transparent 55%);
          mix-blend-mode: screen;
          pointer-events: none;
          opacity: 0.2;
          transition: opacity 0.8s ease;
        }
        .rs-phase-3 .rs-nebula-gases {
          opacity: 1;
          animation: nebulaDrift 8s ease-in-out infinite;
        }

        /* ── Cyber HUD Ring System ── */
        @keyframes gyroScan {
          0% { transform: rotateX(72deg) rotateY(12deg) rotateZ(0deg); }
          100% { transform: rotateX(72deg) rotateY(12deg) rotateZ(360deg); }
        }
        .rs-gyro-reticle {
          position: absolute;
          border-radius: 50%;
          border: 1.5px dashed rgba(34, 211, 238, 0.25);
          pointer-events: none;
          transform-style: preserve-3d;
        }

        /* ── Beautiful Vector Space Planets ── */
        .rs-planet-gas-giant {
          position: absolute;
          top: 15px;
          left: 15px;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #d8b4fe 0%, #7c3aed 55%, #1e1b4b 100%);
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.35);
          z-index: 1;
          pointer-events: none;
          animation: floatPlanetGas 10s ease-in-out infinite;
        }
        .rs-planet-gas-ring {
          position: absolute;
          top: 30px;
          left: -18px;
          width: 88px;
          height: 22px;
          border: 4px double rgba(167, 139, 250, 0.45);
          border-radius: 50%;
          transform: rotate(-24deg) rotateX(76deg);
          pointer-events: none;
          z-index: 1;
          animation: floatPlanetGas 10s ease-in-out infinite;
        }
        @keyframes floatPlanetGas {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(-3deg); }
        }

        .rs-planet-rocky {
          position: absolute;
          bottom: 25px;
          right: 25px;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #fb923c 0%, #ea580c 55%, #311005 100%);
          box-shadow: 0 0 16px rgba(249, 115, 22, 0.3);
          z-index: 1;
          pointer-events: none;
          animation: floatPlanetRocky 7s ease-in-out infinite;
        }
        @keyframes floatPlanetRocky {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-7px) rotate(12deg); }
        }

        /* ── Continuous Active Ignition (Never turns off) ── */
        .rs-smoke-container {
          opacity: 0.8; /* always visible smoke */
          transition: opacity 0.5s ease;
        }
        .rs-phase-2 .rs-smoke-container {
          opacity: 1; /* thicker smoke at warp speed */
        }

        .rs-fire-outer-core, .rs-fire-inner-core, .rs-sparks-container {
          opacity: 1; /* always firing ignition */
          transition: opacity 0.4s ease, scale 0.4s ease;
        }
        
        /* steady-state combustion during diagnostic standby and cruise */
        .rs-phase-0 .rs-fire-outer-core,
        .rs-phase-3 .rs-fire-outer-core {
          scale: 0.78;
          opacity: 0.9;
        }
        .rs-phase-0 .rs-fire-inner-core,
        .rs-phase-3 .rs-fire-inner-core {
          scale: 0.72;
          opacity: 0.95;
        }
        .rs-phase-0 .rs-sparks-container,
        .rs-phase-3 .rs-sparks-container {
          opacity: 0.7;
        }

        /* full launch / warp scale up */
        .rs-phase-1 .rs-fire-outer-core, .rs-phase-2 .rs-fire-outer-core,
        .rs-phase-1 .rs-fire-inner-core, .rs-phase-2 .rs-fire-inner-core,
        .rs-phase-1 .rs-sparks-container, .rs-phase-2 .rs-sparks-container {
          opacity: 1;
          scale: 1.15;
        }

        .rs-shock-diamonds {
          opacity: 0;
          transition: opacity 0.4s ease;
        }
        .rs-phase-2 .rs-shock-diamonds {
          opacity: 1; /* shock diamonds only visible at hyper-warp */
        }
      `}</style>

      {/* Main Loader Visual Box */}
      <div
        className={`rs-loader-workspace-box rs-phase-${phase} ${phase === 2 ? "rs-warp-active" : ""}`}
        style={{
          position: "relative",
          width: rocketSize + 140,
          height: rocketSize + 140,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 5
        }}
      >
        {/* Ambient Shifting Nebula Gases */}
        <div className="rs-nebula-gases" />

        {/* Parallax Cyber Matrix Grid */}
        <div className="rs-cyber-grid-bg" />

        {/* Background Gas Giant (Purple) with Rings */}
        <div className="rs-planet-gas-giant" />
        <div className="rs-planet-gas-ring" />

        {/* Foreground Rocky Planet (Orange) */}
        <div className="rs-planet-rocky" />

        {/* 3D Cosmic Starfield Warp */}
        <div style={{ position: "absolute", inset: -20, overflow: "hidden", pointerEvents: "none" }}>
          {starsData.map((s, idx) => (
            <div
              key={idx}
              className="rs-warp-star-3d"
              style={{
                angle: `${s.angle}deg`,
                "--angle": `${s.angle}deg`,
                "--distance": `${s.distance}px`,
                "--delay": `${s.delay}s`,
                "--duration": `${s.duration}s`,
                "--opacity": s.opacity,
                background: s.color,
                boxShadow: `0 0 6px ${s.color}`,
                "--star-color": s.color
              }}
            />
          ))}
        </div>

        {/* Vector Cyber HUD Rings */}
        <div
          className="rs-gyro-reticle"
          style={{
            width: rocketSize + 110,
            height: rocketSize + 110,
            animation: "gyroScan 8.5s linear infinite"
          }}
        />
        <div
          className="rs-gyro-reticle"
          style={{
            width: rocketSize + 60,
            height: rocketSize + 60,
            borderStyle: "dotted",
            borderColor: "rgba(139, 92, 246, 0.35)",
            animation: "gyroScan 5.5s linear infinite reverse"
          }}
        />

        {/* Shockwave Rings Emitted from Thrust */}
        {phase === 1 && (
          <>
            <div
              style={{
                position: "absolute",
                bottom: 25,
                width: 40,
                height: 40,
                border: "2px solid rgba(255, 87, 34, 0.4)",
                borderRadius: "50%",
                animation: "sonicBoom 1.4s cubic-bezier(0.1, 0.8, 0.3, 1) infinite",
                pointerEvents: "none"
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 25,
                width: 40,
                height: 40,
                border: "2px solid rgba(255, 152, 0, 0.2)",
                borderRadius: "50%",
                animation: "sonicBoom 1.4s cubic-bezier(0.1, 0.8, 0.3, 1) infinite",
                animationDelay: "0.7s",
                pointerEvents: "none"
              }}
            />
          </>
        )}

        {/* Shockwave Rings during Warp Speed */}
        {phase === 2 && (
          <div
            style={{
              position: "absolute",
              width: rocketSize * 0.9,
              height: rocketSize * 0.9,
              border: "3px solid rgba(34, 211, 238, 0.85)",
              borderRadius: "50%",
              animation: "sonicBoom 0.6s cubic-bezier(0.1, 0.8, 0.2, 1) infinite",
              pointerEvents: "none"
            }}
          />
        )}

        {/* Shuddering Stabilization Chamber */}
        <div className="rs-chamber-stabilizer" style={{ width: "100%", height: "100%" }}>
          
          {/* Holographic HUD Laser scanning line */}
          <div className="rs-hud-scanline" />

          {/* Hover stabilization wrapper */}
          <div
            className="rs-hover-flight"
            style={{
              position: "relative",
              width: rocketSize,
              height: rocketSize,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {/* Force Shield Protection Bubble */}
            <div className="rs-forcefield-bubble" />

            {/* Flickering Plasma Lightning Arc Overlays */}
            <svg
              className="rs-lightning-overlay"
              viewBox="0 0 100 100"
              style={{
                position: "absolute",
                inset: -20,
                width: rocketSize + 40,
                height: rocketSize + 40,
                zIndex: 4
              }}
            >
              <path
                className="rs-plasma-arc-1"
                d="M 25 50 L 15 42 L 5 45 L -10 38"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="1.5"
                filter="drop-shadow(0 0 4px #22d3ee)"
              />
              <path
                className="rs-plasma-arc-2"
                d="M 75 50 L 85 58 L 92 50 L 110 54"
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="1.5"
                filter="drop-shadow(0 0 4px #8b5cf6)"
              />
              <path
                className="rs-plasma-arc-3"
                d="M 50 15 L 50 -2 L 40 -10 L 55 -22"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.2"
                filter="drop-shadow(0 0 4px #22d3ee)"
              />
            </svg>

            {/* Billowing Smoke Puffs */}
            <div
              className="rs-smoke-container"
              style={{
                position: "absolute",
                bottom: 0,
                left: "50%",
                width: 2,
                height: 2,
                filter: "url(#billow-smoke-filter)",
                pointerEvents: "none",
                zIndex: 1
              }}
            >
              {smokePuffs.map((p, idx) => (
                <div
                  key={idx}
                  className="rs-smoke-puff"
                  style={{
                    "--sx": `${p.sx}px`,
                    "--dx": `${p.dx}px`,
                    "--delay": `${p.delay}s`,
                    "--duration": `${p.duration}s`
                  }}
                />
              ))}
            </div>

            {/* Engine Ember Sparks */}
            <div
              className="rs-sparks-container"
              style={{
                position: "absolute",
                bottom: 4,
                left: "50%",
                width: 2,
                height: 2,
                pointerEvents: "none",
                zIndex: 2
              }}
            >
              {sparksData.map((sp, idx) => (
                <div
                  key={idx}
                  className="rs-ember-spark"
                  style={{
                    "--sx": `${sp.sx}px`,
                    "--dx": `${sp.dx}px`,
                    "--delay": `${sp.delay}s`,
                    "--duration": `${sp.duration}s`,
                    "--color": sp.color,
                    background: sp.color
                  }}
                />
              ))}
            </div>

            {/* Outer orange fire stream */}
            <div
              className="rs-fire-outer-core"
              style={{
                position: "absolute",
                bottom: -22,
                width: 20,
                height: 32,
                borderRadius: "50% 50% 30% 30%",
                background: "linear-gradient(to bottom, #ff5722 0%, #ef4444 65%, transparent 100%)",
                transformOrigin: "top center",
                zIndex: 2
              }}
            />

            {/* Inner plasma cyan core stream */}
            <div
              className="rs-fire-inner-core"
              style={{
                position: "absolute",
                bottom: -12,
                width: 12,
                height: 20,
                borderRadius: "50% 50% 20% 20%",
                background: "linear-gradient(to bottom, #ffffff 0%, #22d3ee 50%, #06b6d4 100%)",
                transformOrigin: "top center",
                zIndex: 3
              }}
            />

            {/* Supersonic shock diamond nodes */}
            <div
              className="rs-shock-diamonds"
              style={{
                position: "absolute",
                bottom: -32,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
                zIndex: 3,
                pointerEvents: "none"
              }}
            >
              <div className="rs-shock-node" style={{ scale: "1.0" }} />
              <div className="rs-shock-node" style={{ scale: "0.7", animationDelay: "0.02s" }} />
              <div className="rs-shock-node" style={{ scale: "0.45", animationDelay: "0.04s" }} />
            </div>

            {/* Rocket Logo Image */}
            <img
              src={processedLogo}
              alt="Rocket logo"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                zIndex: 3,
                filter: dk
                  ? "drop-shadow(0 6px 16px rgba(99, 102, 241, 0.45))"
                  : "drop-shadow(0 4px 10px rgba(99, 102, 241, 0.25))"
              }}
            />
          </div>
        </div>
      </div>

      {msg && (
        <span
          style={{
            fontSize: 13,
            color: dk ? "rgba(165, 180, 252, 0.8)" : "rgba(79, 70, 229, 0.95)",
            fontWeight: 800,
            letterSpacing: "2px",
            marginTop: 20,
            animation: "pulse 1.6s ease-in-out infinite",
            textTransform: "uppercase",
            fontFamily: "monospace",
            position: "relative",
            zIndex: 20,
            textShadow: dk ? "0 0 8px rgba(99,102,241,0.3)" : "none"
          }}
        >
          {msg}
        </span>
      )}
    </div>
  );
}

export default Spin;
