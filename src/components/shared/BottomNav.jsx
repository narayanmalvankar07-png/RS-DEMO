import { Home, Users, MessageCircle, Calendar, Wallet } from "lucide-react";
import { T } from "../../config/constants.js";

const LINKS = [
  { id: "feed",     icon: Home,          label: "Feed" },
  { id: "network",  icon: Users,         label: "Network" },
  { id: "messages", icon: MessageCircle, label: "Messages" },
  { id: "events",   icon: Calendar,      label: "Events" },
  { id: "wallet",   icon: Wallet,        label: "Wallet" },
];

export default function BottomNav({ view, setView, dk, bals, me }) {
  const th = T(dk);
  const bal = bals[me] ?? 0;

  return (
    <div style={{
      position: "fixed",
      bottom: 12, left: 12, right: 12,
      zIndex: 100,
      background: th.side,
      backdropFilter: th.blur,
      WebkitBackdropFilter: th.blur,
      border: `1px solid ${th.bdr}`,
      borderRadius: 24,
      boxShadow: dk
        ? "0 -8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)"
        : "0 -8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.6)",
      display: "flex", alignItems: "stretch",
      overflow: "hidden",
      animation: "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both",
      animationDelay: "0.1s",
    }}>
      {LINKS.map(link => {
        const Icon = link.icon;
        const isActive = view === link.id;
        const isWallet = link.id === "wallet";
        const activeColor = isWallet ? "#f59e0b" : "#6366f1";
        return (
          <button
            key={link.id}
            onClick={() => setView(link.id)}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: "12px 4px 10px", border: "none",
              background: isActive ? `${activeColor}${dk ? "18" : "10"}` : "transparent",
              color: isActive ? activeColor : th.txt3,
              cursor: "pointer",
              transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
              position: "relative",
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = th.surf2; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
          >
            {/* Active indicator pill at top */}
            {isActive && (
              <span style={{
                position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                width: 28, height: 2.5, borderRadius: 99,
                background: activeColor,
                boxShadow: `0 0 8px ${activeColor}`,
              }} />
            )}
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, marginTop: 4 }}>
              {link.label}
            </span>
            {isWallet && bal > 0 && (
              <span style={{
                position: "absolute", top: 8, right: "calc(50% - 16px)",
                background: "#f59e0b", color: "#fff", fontSize: 7, fontWeight: 800,
                padding: "1px 4px", borderRadius: 99, minWidth: 14, textAlign: "center",
                boxShadow: "0 0 6px rgba(245,158,11,0.6)",
              }}>
                {bal}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
