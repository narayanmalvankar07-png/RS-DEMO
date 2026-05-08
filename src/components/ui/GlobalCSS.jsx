export default function GlobalCSS({ dk }) {
  const darkBg = [
    "radial-gradient(ellipse 80% 70% at 15% 10%, rgba(99,102,241,0.18) 0%, transparent 55%)",
    "radial-gradient(ellipse 70% 70% at 85% 90%, rgba(139,92,246,0.14) 0%, transparent 55%)",
    "radial-gradient(ellipse 60% 50% at 60% 50%, rgba(59,130,246,0.08) 0%, transparent 60%)",
    "#04070f",
  ].join(",");

  const lightBg = [
    "radial-gradient(ellipse 80% 70% at 15% 10%, rgba(99,102,241,0.22) 0%, transparent 55%)",
    "radial-gradient(ellipse 70% 70% at 85% 90%, rgba(139,92,246,0.20) 0%, transparent 55%)",
    "radial-gradient(ellipse 55% 50% at 55% 100%, rgba(59,130,246,0.16) 0%, transparent 60%)",
    "#dde4ff",
  ].join(",");

  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap');

      *, *::before, *::after { box-sizing: border-box; }

      html, body, #root { margin: 0; padding: 0; height: 100%; }

      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
        background: ${dk ? darkBg : lightBg};
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        background-attachment: fixed;
      }

      /* ── Keyframes ── */
      @keyframes fadeUp   { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
      @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
      @keyframes scaleIn  { from { opacity:0; transform:scale(0.93); } to { opacity:1; transform:scale(1); } }
      @keyframes slideInLeft { from { opacity:0; transform:translateX(-18px); } to { opacity:1; transform:translateX(0); } }
      @keyframes spin     { to   { transform:rotate(360deg); } }
      @keyframes popIn    { 0% { transform:scale(0.5); opacity:0; } 70% { transform:scale(1.15); } 100% { transform:scale(1); opacity:1; } }
      @keyframes shimmer  { from { background-position:-200% center; } to { background-position:200% center; } }
      @keyframes pulse    { 0%,100% { opacity:1; } 50% { opacity:0.55; } }
      @keyframes orb      { 0%,100% { transform:translate(0,0) scale(1); } 33% { transform:translate(30px,-20px) scale(1.05); } 66% { transform:translate(-15px,25px) scale(0.97); } }

      @keyframes floatTopIn {
        from { opacity: 0; transform: translateY(-16px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes floatBottomIn {
        from { opacity: 0; transform: translateY(20px) scale(0.96); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes pageIn {
        from { opacity: 0; transform: translateY(10px) scale(0.99); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes iconBounce {
        0%   { transform: scale(1) rotate(0); }
        35%  { transform: scale(1.35) rotate(-12deg); }
        65%  { transform: scale(0.88) rotate(6deg); }
        100% { transform: scale(1) rotate(0); }
      }
      @keyframes skeletonShimmer {
        from { background-position: -600px 0; }
        to   { background-position:  600px 0; }
      }
      @keyframes notifPop {
        0%   { transform: scale(0.6); opacity: 0; }
        70%  { transform: scale(1.2); }
        100% { transform: scale(1); opacity: 1; }
      }

      /* ── Animated utility classes ── */
      .rs-fade-up      { animation: fadeUp      0.4s cubic-bezier(0.22,1,0.36,1) both; }
      .rs-fade-in      { animation: fadeIn      0.3s ease both; }
      .rs-scale-in     { animation: scaleIn     0.35s cubic-bezier(0.22,1,0.36,1) both; }
      .rs-slide-in     { animation: slideInLeft 0.35s cubic-bezier(0.22,1,0.36,1) both; }
      .rs-float-top    { animation: floatTopIn  0.45s cubic-bezier(0.22,1,0.36,1) both; }
      .rs-float-bottom { animation: floatBottomIn 0.45s cubic-bezier(0.22,1,0.36,1) both; animation-delay: 0.08s; }
      .rs-page-in      { animation: pageIn 0.38s cubic-bezier(0.22,1,0.36,1) both; }

      /* Stagger children */
      .rs-stagger > * { animation: fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both; }
      .rs-stagger > *:nth-child(1)  { animation-delay:  0ms; }
      .rs-stagger > *:nth-child(2)  { animation-delay: 55ms; }
      .rs-stagger > *:nth-child(3)  { animation-delay:110ms; }
      .rs-stagger > *:nth-child(4)  { animation-delay:165ms; }
      .rs-stagger > *:nth-child(5)  { animation-delay:220ms; }
      .rs-stagger > *:nth-child(6)  { animation-delay:275ms; }
      .rs-stagger > *:nth-child(7)  { animation-delay:330ms; }
      .rs-stagger > *:nth-child(8)  { animation-delay:385ms; }

      /* Page card stagger */
      .rs-page-in > * { animation: fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both; }
      .rs-page-in > *:nth-child(1)  { animation-delay:  20ms; }
      .rs-page-in > *:nth-child(2)  { animation-delay:  70ms; }
      .rs-page-in > *:nth-child(3)  { animation-delay: 120ms; }
      .rs-page-in > *:nth-child(4)  { animation-delay: 170ms; }
      .rs-page-in > *:nth-child(5)  { animation-delay: 220ms; }
      .rs-page-in > *:nth-child(6)  { animation-delay: 270ms; }
      .rs-page-in > *:nth-child(7)  { animation-delay: 320ms; }
      .rs-page-in > *:nth-child(8)  { animation-delay: 370ms; }

      /* Skeleton shimmer */
      .rs-skeleton {
        background: linear-gradient(90deg,
          ${dk ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} 25%,
          ${dk ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)"} 50%,
          ${dk ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"} 75%);
        background-size: 600px 100%;
        animation: skeletonShimmer 1.5s ease infinite;
        border-radius: 10px;
      }

      /* Icon bounce on hover */
      .rs-icon-btn:hover svg { animation: iconBounce 0.48s cubic-bezier(0.34,1.56,0.64,1); }
      .rs-icon-btn { transition: color 0.18s ease, background 0.18s ease; }

      /* ── Glass card hover lift ── */
      .rs-card {
        transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1),
                    box-shadow 0.28s ease;
      }
      .rs-card:hover {
        transform: translateY(-3px) scale(1.005);
        box-shadow: 0 20px 60px rgba(0,0,0,${dk ? "0.35" : "0.12"});
      }

      /* ── Button spring ── */
      button {
        font-family: inherit;
        transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1),
                    opacity 0.15s ease,
                    box-shadow 0.22s ease,
                    background 0.18s ease,
                    color 0.18s ease;
      }
      button:active:not(:disabled) { transform: scale(0.95) !important; }

      /* Primary spring buttons */
      .rs-btn-spring:hover:not(:disabled) { transform: scale(1.05); box-shadow: 0 8px 24px rgba(59,130,246,0.35); }

      /* ── Scrollbar ── */
      ::-webkit-scrollbar { width: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb {
        background: ${dk ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"};
        border-radius: 99px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: ${dk ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"};
      }

      /* ── Misc ── */
      input, textarea { font-family: inherit; transition: border-color 0.2s, box-shadow 0.2s; }
      input::placeholder, textarea::placeholder {
        color: ${dk ? "rgba(120,150,210,0.42)" : "rgba(100,116,139,0.55)"};
      }
      a { text-decoration: none; color: inherit; }
    `}</style>
  );
}
