import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Sparkles, Shield, Rocket, Crown, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { T } from "../../config/constants.js";
import { toast } from "sonner";
import { db } from "../../services/supabase.js";

const FEATURE_MATRIX = [
  { feature: "Browse Collab", free: "✅", starter: "✅", growth: "✅" },
  { feature: "Join Existing Startup", free: "✅", starter: "✅", growth: "✅" },
  { feature: "Create Startup", free: "❌", starter: "✅", growth: "✅" },
  { feature: "Founder Dashboard", free: "❌", starter: "✅", growth: "✅" },
  { feature: "CRM Access", free: "❌", starter: "✅", growth: "✅" },
  { feature: "Product Listings", free: "❌", starter: "Up to 3", growth: "Up to 10" },
  { feature: "Manage Startup Pages", free: "❌", starter: "Default Pages Only", growth: "Full Access" },
  { feature: "Funding Access", free: "❌", starter: "✅", growth: "✅" },
  { feature: "Funding Applications", free: "❌", starter: "30 / month", growth: "Unlimited" },
  { feature: "AI Investor Recommendations", free: "❌", starter: "❌", growth: "✅" },
  { feature: "AI Fundraising Matchmaking", free: "❌", starter: "❌", growth: "✅" },
  { feature: "AI Client Matchmaking", free: "❌", starter: "❌", growth: "✅" },
];

export default function SubscriptionModal({ isOpen, onClose, me, myProfile, dk, onSubscriptionUpdated, isMobile = false }) {
  const th = T(dk);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [activeTab, setActiveTab] = useState("plans");

  if (!isOpen) return null;

  const currentPlan = myProfile?.subscription_plan || "free";

  const handleSubscribe = async (planId) => {
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/cashfree/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": me || "",
        },
        body: JSON.stringify({
          planId,
          userId: me,
          customerEmail: myProfile?.email || "founder@rightsignal.co",
          customerName: myProfile?.name || "Founder Member",
          customerPhone: myProfile?.phone || "9999999999",
          returnUrl: `${window.location.origin}/?cf_order_id={order_id}&plan=${planId}`,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create payment session");
      }

      toast.success(`Redirecting to Cashfree checkout for ${planId === "starter" ? "Founder Starter" : "Founder Growth"}…`);

      if (data.payment_link) {
        window.location.href = data.payment_link;
        return;
      }

      if (data.payment_session_id) {
        let CashfreeSDK = window.Cashfree;
        if (!CashfreeSDK) {
          await new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
            script.onload = () => resolve(window.Cashfree);
            script.onerror = () => resolve(null);
            document.head.appendChild(script);
          });
          CashfreeSDK = window.Cashfree;
        }

        const isLocal = window.location.hostname.includes("localhost") || window.location.hostname.includes("127.0.0.1");
        const checkoutMode = data.mode || (isLocal ? "sandbox" : "production");

        if (CashfreeSDK) {
          const cashfree = CashfreeSDK({ mode: checkoutMode });
          cashfree.checkout({ paymentSessionId: data.payment_session_id });
        } else {
          toast.error("Failed to load Cashfree Payment SDK. Please refresh and try again.");
        }
      }
    } catch (err) {
      console.error("[Subscription] Payment launch error:", err);
      toast.error(err.message || "Payment initiation failed. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const activatePlanLocally = async (planId, orderId) => {
    try {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const currentSocials = myProfile?.social_links || {};
      const updatedSocials = {
        ...currentSocials,
        _subscription: { plan: planId, status: "active", expires_at: expiresAt }
      };

      const updates = {
        subscription_plan: planId,
        subscription_status: "active",
        subscription_expires_at: expiresAt,
        social_links: updatedSocials,
        updated_at: new Date().toISOString(),
      };

      if (me) {
        try {
          await db.patch("rs_user_profiles", `id=eq.${me}`, updates);
        } catch {
          await db.patch("rs_user_profiles", `id=eq.${me}`, { social_links: updatedSocials, updated_at: new Date().toISOString() });
        }
      }

      onSubscriptionUpdated?.({ ...myProfile, ...updates });
      toast.success(`🎉 Upgrade Successful! Active Plan: ${planId === "starter" ? "Founder Starter (₹499/mo)" : "Founder Growth (₹1,299/mo)"}`);
      onClose();
    } catch (e) {
      console.error("Failed to update subscription locally:", e);
      toast.error("Failed to update subscription.");
    }
  };

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? 12 : 24 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(10px)" }} />

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 960,
          maxHeight: "92vh",
          background: th.side,
          border: `1px solid ${th.bdr}`,
          borderRadius: 24,
          boxShadow: "0 25px 70px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          backdropFilter: th.blur,
          WebkitBackdropFilter: th.blur,
          animation: "rs-fade-up 0.3s ease-out",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${th.bdr}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: dk ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 4px 14px rgba(99,102,241,0.3)" }}>
              <Sparkles size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: th.txt, display: "flex", alignItems: "center", gap: 8 }}>
                RightSignal Subscription
                <span style={{ fontSize: 10, background: "rgba(99,102,241,0.15)", color: "#6366f1", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>Cashfree PG</span>
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: th.txt3 }}>Unlock Funding, Collab Startup Creation, Founder CRM & AI Matchmaking</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", background: dk ? "rgba(255,255,255,0.06)" : "#f1f5f9", padding: 3, borderRadius: 12, border: `1px solid ${th.bdr}` }}>
              <button
                onClick={() => setActiveTab("plans")}
                style={{ padding: "6px 14px", borderRadius: 9, border: "none", background: activeTab === "plans" ? "#6366f1" : "transparent", color: activeTab === "plans" ? "#fff" : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
              >
                Plans
              </button>
              <button
                onClick={() => setActiveTab("matrix")}
                style={{ padding: "6px 14px", borderRadius: 9, border: "none", background: activeTab === "matrix" ? "#6366f1" : "transparent", color: activeTab === "matrix" ? "#fff" : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
              >
                Feature Matrix
              </button>
            </div>

            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${th.bdr}`, borderRadius: 10, padding: 8, cursor: "pointer", color: th.txt2, display: "flex" }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
          {activeTab === "plans" ? (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>

              {/* Starter (₹499) */}
              <div
                style={{
                  background: currentPlan === "starter" ? (dk ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.05)") : th.surf,
                  border: `2px solid ${currentPlan === "starter" ? "#6366f1" : th.bdr}`,
                  borderRadius: 20,
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                }}
              >
                {currentPlan === "starter" && (
                  <span style={{ position: "absolute", top: 16, right: 16, background: "#10b981", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 99 }}>
                    CURRENT PLAN
                  </span>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Rocket size={20} color="#6366f1" />
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: th.txt }}>Founder Starter</h3>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 14 }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: th.txt }}>₹499</span>
                  <span style={{ fontSize: 14, color: th.txt3 }}>/ month</span>
                </div>

                <p style={{ fontSize: 13, color: th.txt2, marginBottom: 18, lineHeight: 1.4 }}>
                  Essential tools to launch 1 startup, access funding, handle investor outreach, and manage products.
                </p>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                  {[
                    "Create 1 Startup",
                    "Founder Dashboard & CRM Access",
                    "Up to 3 Products / Services",
                    "Funding Module Access",
                    "Apply to 30 investors / month",
                    "Default startup pages management",
                  ].map((feat) => (
                    <div key={feat} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: th.txt }}>
                      <CheckCircle2 size={16} color="#6366f1" style={{ flexShrink: 0 }} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleSubscribe("starter")}
                  disabled={loadingPlan === "starter" || currentPlan === "starter"}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 14,
                    border: "none",
                    background: currentPlan === "starter" ? "rgba(99,102,241,0.2)" : "#6366f1",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: currentPlan === "starter" ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: "0 4px 16px rgba(99,102,241,0.3)",
                  }}
                >
                  {loadingPlan === "starter" ? <Loader2 size={16} className="animate-spin" /> : currentPlan === "starter" ? "Active Plan" : <>Upgrade for ₹499 <ArrowRight size={16} /></>}
                </button>
              </div>

              {/* Growth (₹1,299) */}
              <div
                style={{
                  background: currentPlan === "growth" ? (dk ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.05)") : th.surf,
                  border: `2px solid ${currentPlan === "growth" ? "#8b5cf6" : "#8b5cf6"}`,
                  borderRadius: 20,
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  boxShadow: "0 10px 35px rgba(139,92,246,0.2)",
                }}
              >
                <span style={{ position: "absolute", top: -12, right: 20, background: "linear-gradient(135deg,#8b5cf6,#ec4899)", color: "#fff", fontSize: 10, fontWeight: 900, padding: "4px 12px", borderRadius: 99, letterSpacing: 0.5, boxShadow: "0 4px 12px rgba(139,92,246,0.4)" }}>
                  POPULAR & UNLIMITED
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Crown size={20} color="#8b5cf6" />
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: th.txt }}>Founder Growth</h3>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 14 }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: th.txt }}>₹1,299</span>
                  <span style={{ fontSize: 14, color: th.txt3 }}>/ month</span>
                </div>

                <p style={{ fontSize: 13, color: th.txt2, marginBottom: 18, lineHeight: 1.4 }}>
                  Full power startup acceleration with unlimited funding applications, 10 products, and AI matchmaking.
                </p>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                  {[
                    "Everything in Starter Plan",
                    "Up to 10 Products / Services",
                    "Unlimited Funding Applications",
                    "AI Investor Recommendations",
                    "AI Fundraising Matchmaking",
                    "AI Client Matchmaking",
                    "Advanced Founder Dashboard & Full Custom Pages",
                  ].map((feat) => (
                    <div key={feat} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: th.txt }}>
                      <CheckCircle2 size={16} color="#8b5cf6" style={{ flexShrink: 0 }} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleSubscribe("growth")}
                  disabled={loadingPlan === "growth" || currentPlan === "growth"}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 14,
                    border: "none",
                    background: currentPlan === "growth" ? "rgba(139,92,246,0.2)" : "linear-gradient(135deg, #8b5cf6, #ec4899)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: currentPlan === "growth" ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: "0 4px 16px rgba(139,92,246,0.4)",
                  }}
                >
                  {loadingPlan === "growth" ? <Loader2 size={16} className="animate-spin" /> : currentPlan === "growth" ? "Active Plan" : <>Upgrade for ₹1,299 <ArrowRight size={16} /></>}
                </button>
              </div>

            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${th.bdr}` }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", color: th.txt3, fontWeight: 700 }}>Platform Feature</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", color: th.txt3, fontWeight: 700 }}>Free User</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", color: "#6366f1", fontWeight: 700 }}>₹499 Starter</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", color: "#8b5cf6", fontWeight: 700 }}>₹1,299 Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_MATRIX.map((row, idx) => (
                    <tr key={row.feature} style={{ borderBottom: `1px solid ${th.bdr}`, background: idx % 2 === 0 ? "transparent" : (dk ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)") }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: th.txt }}>{row.feature}</td>
                      <td style={{ padding: "12px 16px", textAlign: "center", color: th.txt2 }}>{row.free}</td>
                      <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: "#6366f1" }}>{row.starter}</td>
                      <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700, color: "#8b5cf6" }}>{row.growth}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px", borderTop: `1px solid ${th.bdr}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: dk ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)", fontSize: 12, color: th.txt3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Shield size={14} color="#10b981" />
            <span>Encrypted payment processing powered by <strong>Cashfree Payments</strong></span>
          </div>
          <span>Instant activation after payment confirmation</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
