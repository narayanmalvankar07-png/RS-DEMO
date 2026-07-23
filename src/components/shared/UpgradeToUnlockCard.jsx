import React from "react";
import { Lock, Crown, Sparkles, ArrowRight, ShieldAlert } from "lucide-react";
import { T } from "../../config/constants.js";

export default function UpgradeToUnlockCard({
  sectionName = "this feature",
  description = null,
  openSubscriptionModal,
  dk = true,
  compact = false,
  badgeText = "Plan Inactive / Expired"
}) {
  const th = T(dk);

  if (compact) {
    return (
      <div style={{
        background: dk ? "rgba(239, 68, 68, 0.12)" : "#fef2f2",
        border: `1px solid ${dk ? "rgba(239, 68, 68, 0.3)" : "#fca5a5"}`,
        borderRadius: 14,
        padding: "12px 16px",
        margin: "12px 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 220 }}>
          <ShieldAlert size={20} color="#ef4444" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: dk ? "#fca5a5" : "#991b1b" }}>
              {badgeText}: {sectionName} Hidden
            </div>
            <div style={{ fontSize: 12, color: dk ? "rgba(255,255,255,0.7)" : "#7f1d1d" }}>
              {description || `Upgrade your plan to make ${sectionName.toLowerCase()} visible to other users and unlock tools.`}
            </div>
          </div>
        </div>
        <button
          onClick={openSubscriptionModal}
          style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#ffffff",
            border: "none",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
            flexShrink: 0
          }}
        >
          <Crown size={14} /> Upgrade to Unlock
        </button>
      </div>
    );
  }

  return (
    <div style={{
      background: dk 
        ? "linear-gradient(135deg, rgba(30, 27, 75, 0.8), rgba(15, 23, 42, 0.95))"
        : "linear-gradient(135deg, #eef2ff, #f8fafc)",
      border: `1px solid ${dk ? "rgba(99, 102, 241, 0.3)" : "#c7d2fe"}`,
      borderRadius: 20,
      padding: "36px 24px",
      margin: "20px 0",
      textAlign: "center",
      boxShadow: dk ? "0 12px 40px rgba(0,0,0,0.5)" : "0 12px 30px rgba(99,102,241,0.08)",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Accent glow */}
      <div style={{
        position: "absolute",
        top: "-40px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "200px",
        height: "100px",
        background: "radial-gradient(circle, rgba(99,102,241,0.3) 0%, rgba(0,0,0,0) 70%)",
        pointerEvents: "none"
      }} />

      <div style={{
        width: 60,
        height: 60,
        borderRadius: "50%",
        background: dk ? "rgba(99, 102, 241, 0.15)" : "#e0e7ff",
        border: `1px solid ${dk ? "rgba(99, 102, 241, 0.4)" : "#a5b4fc"}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16
      }}>
        <Lock size={28} color="#6366f1" />
      </div>

      <h3 style={{
        margin: "0 0 8px",
        fontSize: 20,
        fontWeight: 800,
        color: th.txt,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8
      }}>
        Upgrade to Show & Unlock {sectionName}
      </h3>

      <p style={{
        margin: "0 auto 20px",
        maxWidth: 480,
        fontSize: 14,
        lineHeight: "1.5",
        color: th.txt2
      }}>
        {description || `Your subscription plan is inactive or on the free tier. Upgrade your plan to make ${sectionName.toLowerCase()} visible to other users and gain access to founder features.`}
      </p>

      <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={openSubscriptionModal}
          style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 6px 20px rgba(99,102,241,0.4)"
          }}
        >
          <Sparkles size={16} /> Upgrade Plan to Unlock <ArrowRight size={16} />
        </button>
      </div>

      <div style={{
        marginTop: 18,
        fontSize: 12,
        color: th.txt3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6
      }}>
        <Crown size={14} color="#f59e0b" /> Founder Starter & Growth plans unlock startup publishing, CRM & product listings
      </div>
    </div>
  );
}
