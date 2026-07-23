import { createPortal } from "react-dom";
import { Sparkles, Crown, CheckCircle2, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { T } from "../../config/constants.js";

export default function PaymentSuccessModal({ isOpen, onClose, data, dk, onViewProfile }) {
  if (!isOpen || !data) return null;
  const th = T(dk);

  const isGrowth = data.plan === "growth";
  const planTitle = isGrowth ? "Founder Growth" : "Founder Starter";
  const planColor = isGrowth ? "#f59e0b" : "#6366f1";
  const planGlow = isGrowth ? "rgba(245, 158, 11, 0.35)" : "rgba(99, 102, 241, 0.35)";

  const portalRoot = document.getElementById("portal-root") || document.body;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "rs-fade-in 0.25s ease-out",
      }}
    >
      {/* Liquid Glass Overlay Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: dk ? "rgba(5, 8, 20, 0.82)" : "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      />

      {/* Main Liquid Glass Modal Container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          background: dk
            ? "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)"
            : "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 245, 249, 0.85) 100%)",
          border: `1px solid ${dk ? "rgba(255, 255, 255, 0.18)" : "rgba(255, 255, 255, 0.8)"}`,
          borderRadius: 28,
          boxShadow: `0 30px 80px rgba(0, 0, 0, 0.45), 0 0 50px ${planGlow}, inset 0 1px 0 ${dk ? "rgba(255, 255, 255, 0.25)" : "#fff"}`,
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
          padding: "36px 30px 30px",
          textAlign: "center",
          overflow: "hidden",
          boxSizing: "border-box",
          animation: "rs-scale-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Background Ambient Glow Accent */}
        <div
          style={{
            position: "absolute",
            top: -60,
            left: "50%",
            transform: "translateX(-50%)",
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: planColor,
            filter: "blur(70px)",
            opacity: dk ? 0.35 : 0.25,
            pointerEvents: "none",
          }}
        />

        {/* Crown Icon Container */}
        <div style={{ position: "relative", display: "inline-block", marginBottom: 20 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              background: `linear-gradient(135deg, ${planColor}, ${isGrowth ? "#fbbf24" : "#8b5cf6"})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: `0 12px 30px ${planGlow}`,
              margin: "0 auto",
            }}
          >
            <Crown size={42} style={{ fill: "#fff", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.3))" }} />
          </div>
          <div
            style={{
              position: "absolute",
              bottom: -4,
              right: -4,
              background: "#10b981",
              color: "#fff",
              borderRadius: "50%",
              width: 26,
              height: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `3px solid ${dk ? "#0c1929" : "#fff"}`,
              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.4)",
            }}
          >
            <CheckCircle2 size={16} />
          </div>
        </div>

        {/* Status Pill */}
        <div style={{ marginBottom: 12 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "1.2px",
              padding: "4px 14px",
              borderRadius: 99,
              background: "rgba(16, 185, 129, 0.15)",
              color: "#10b981",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <ShieldCheck size={13} /> Payment Verified
          </span>
        </div>

        {/* Header Title */}
        <h2
          style={{
            margin: "0 0 8px 0",
            fontSize: 26,
            fontWeight: 900,
            color: th.txt,
            letterSpacing: "-0.5px",
          }}
        >
          Welcome to <span style={{ color: planColor }}>{planTitle}</span>!
        </h2>

        <p
          style={{
            margin: "0 0 24px 0",
            fontSize: 14,
            color: th.txt2,
            lineHeight: 1.5,
          }}
        >
          Your subscription is now active! You’ve unlocked exclusive founder tools and a custom crown badge on your profile.
        </p>

        {/* Feature Highlights Grid */}
        <div
          style={{
            background: dk ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
            border: `1px solid ${th.bdr}`,
            borderRadius: 16,
            padding: "14px 16px",
            marginBottom: 26,
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: th.txt, fontWeight: 600 }}>
            <Zap size={16} style={{ color: planColor }} />
            <span>{isGrowth ? "Unlimited Investor Applications & Outreach" : "Apply to 30 Investors / Month"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: th.txt, fontWeight: 600 }}>
            <Sparkles size={16} style={{ color: planColor }} />
            <span>{isGrowth ? "AI Investor & Matchmaking Engines Unlocked" : "Founder Dashboard & CRM Tools Access"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: th.txt, fontWeight: 600 }}>
            <Crown size={16} style={{ color: planColor }} />
            <span>Exclusive {isGrowth ? "Gold" : "Indigo"} Crown Badge Active</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => {
              onClose();
              if (onViewProfile) onViewProfile();
            }}
            style={{
              flex: 1,
              padding: "12px 18px",
              borderRadius: 14,
              border: `1px solid ${th.bdr}`,
              background: dk ? "rgba(255, 255, 255, 0.06)" : "#fff",
              color: th.txt,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = dk ? "rgba(255, 255, 255, 0.12)" : "#f8fafc")}
            onMouseLeave={(e) => (e.currentTarget.style.background = dk ? "rgba(255, 255, 255, 0.06)" : "#fff")}
          >
            View Profile
          </button>

          <button
            onClick={onClose}
            style={{
              flex: 1.3,
              padding: "12px 18px",
              borderRadius: 14,
              border: "none",
              background: `linear-gradient(135deg, ${planColor}, ${isGrowth ? "#d97706" : "#4f46e5"})`,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: `0 6px 20px ${planGlow}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <span>Explore RightSignal</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>,
    portalRoot
  );
}
