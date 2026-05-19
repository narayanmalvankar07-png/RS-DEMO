import { useState } from "react";
import { Home, Users, MessageCircle, Calendar, Lightbulb, FileText, Wallet, Megaphone, FlaskConical, X } from "lucide-react";
import { T } from "../../config/constants.js";
import { canManageAds } from "../../utils/helpers.js";
import Av from "../ui/Av.jsx";
import RightSignalLogo from "../ui/RightSignalLogo.jsx";

const NAV_LINKS = [
  { id: "feed",       icon: Home,          label: "Feed" },
  { id: "network",    icon: Users,         label: "Network" },
  { id: "messages",   icon: MessageCircle, label: "Messages" },
  { id: "colab",      icon: Lightbulb,     label: "Colab" },
  { id: "events",     icon: Calendar,      label: "Events" },
  { id: "sandbox",    icon: FlaskConical,  label: "Sandbox" },
  { id: "contribute", icon: FileText,      label: "Contribute" },
  { id: "wallet",     icon: Wallet,        label: "Wallet", walletBadge: true },
];

export default function Sidebar({ view, setView, me, dk, bals, myProfile, open, onClose }) {
  const th = T(dk);
  const bal = bals[me] ?? 0;

  const links = [
    ...NAV_LINKS,
    ...(canManageAds(myProfile) ? [{ id: "ads", icon: Megaphone, label: "Ads Manager" }] : []),
  ];

  const innerContent = (
    <>
      {/* Logo row */}
      <div style={{ padding: "18px 16px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <RightSignalLogo size={30} dk={dk} />
        {onClose && (
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, cursor: "pointer", color: th.txt3, padding: "4px 5px", display: "flex", lineHeight: 0 }}>
            <X size={15} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ padding: "4px 10px", flex: 1, overflowY: "auto" }} className="rs-stagger">
        {links.map(link => {
          const Icon = link.icon;
          const isActive = view === link.id;
          const isWallet = link.id === "wallet";
          const activeColor = isWallet ? "#f59e0b" : "#6366f1";
          return (
            <button
              key={link.id}
              onClick={() => { setView(link.id); onClose?.(); }}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "10px 13px", borderRadius: 14, border: "none", marginBottom: 2,
                background: isActive
                  ? `${activeColor}${dk ? "22" : "14"}`
                  : "transparent",
                color: isActive ? activeColor : th.txt2,
                fontSize: 13, fontWeight: isActive ? 700 : 500, cursor: "pointer",
                textAlign: "left",
                boxShadow: isActive
                  ? `inset 0 0 0 1px ${activeColor}35, 0 4px 12px ${activeColor}15`
                  : "none",
                transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
                position: "relative",
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = th.surf2; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              {/* Active glow dot */}
              {isActive && (
                <span style={{
                  position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)",
                  width: 3, height: 18, borderRadius: 99,
                  background: `linear-gradient(180deg, ${activeColor}, ${activeColor}88)`,
                  boxShadow: `0 0 8px ${activeColor}`,
                }} />
              )}
              <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
              <span style={{ flex: 1 }}>{link.label}</span>
              {link.walletBadge && (
                <span style={{
                  background: dk ? "rgba(245,158,11,0.18)" : "rgba(245,158,11,0.12)",
                  color: "#f59e0b", fontSize: 10, fontWeight: 800,
                  padding: "1px 7px", borderRadius: 99,
                  border: "1px solid rgba(245,158,11,0.3)",
                }}>
                  {bal}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Profile footer */}
      <div style={{ padding: "10px 10px 12px", flexShrink: 0 }}>
        <div style={{ height: 1, background: th.bdr, marginBottom: 10 }} />
        <button
          onClick={() => { setView("profile"); onClose?.(); }}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "10px 12px", borderRadius: 16, border: "none",
            background: th.surf2,
            backdropFilter: th.blur, WebkitBackdropFilter: th.blur,
            cursor: "pointer",
            transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = th.surf; e.currentTarget.style.transform = "scale(1.02)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = th.surf2; e.currentTarget.style.transform = "scale(1)"; }}
        >
          <Av profile={myProfile || {}} size={30} bal={bal} />
          <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: th.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{myProfile?.name || "User"}</div>
            <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>◈ {bal} SGN</div>
          </div>
        </button>
      </div>
    </>
  );

  /* ── Mobile drawer ── */
  if (onClose !== undefined) {
    return (
      <>
        {open && (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex" }}>
            <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }} />
            <div className="rs-slide-in" style={{
              position: "relative", zIndex: 1, width: 240, maxWidth: "80vw",
              height: "100%", display: "flex", flexDirection: "column",
              background: th.side,
              backdropFilter: th.blur, WebkitBackdropFilter: th.blur,
              borderRight: `1px solid ${th.bdr}`,
              borderTopRightRadius: 20, borderBottomRightRadius: 20,
              boxShadow: "12px 0 60px rgba(0,0,0,.4)",
              overflow: "hidden",
            }}>
              {innerContent}
            </div>
          </div>
        )}
      </>
    );
  }

  /* ── Desktop floating sidebar ── */
  return (
    <div style={{
      position: "fixed",
      left: 12, top: 12, bottom: 12,
      width: 210,
      zIndex: 100,
      display: "flex", flexDirection: "column",
      background: th.side,
      backdropFilter: th.blur, WebkitBackdropFilter: th.blur,
      border: `1px solid ${th.bdr}`,
      borderRadius: 24,
      boxShadow: dk
        ? "0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.07)"
        : "0 24px 60px rgba(0,0,0,0.14), 0 0 0 1px rgba(255,255,255,0.6), inset 0 1px 0 rgba(255,255,255,0.8)",
      overflow: "hidden",
      animation: "slideInLeft 0.45s cubic-bezier(0.22,1,0.36,1) both",
    }}>
      {innerContent}
    </div>
  );
}
