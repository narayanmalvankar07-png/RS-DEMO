import { Home, Users, MessageCircle, Calendar, Lightbulb, CircleDollarSign } from "lucide-react";
import { T } from "../../config/constants.js";

const LINKS = [
  { id: "feed", icon: Home, label: "Feed" },
  { id: "network", icon: Users, label: "Network" },
  { id: "colab", icon: Lightbulb, label: "Colab", highlighted: true, color: "#6366f1", bgGradient: "linear-gradient(135deg, #6366f1, #8b5cf6)" },
  { id: "funding", icon: CircleDollarSign, label: "Funding", highlighted: true, color: "#10b981", bgGradient: "linear-gradient(135deg, #10b981, #059669)" },
  { id: "messages", icon: MessageCircle, label: "Messages" },
  { id: "events", icon: Calendar, label: "Events" },
];

export default function BottomNav({ view, setView, dk, unreadMsgs = 0 }) {
  const th = T(dk);

  return (
    <div style={{
      position: "fixed",
      bottom: 10, left: 10, right: 10,
      zIndex: 100,
      background: th.side,
      backdropFilter: th.blur,
      WebkitBackdropFilter: th.blur,
      border: `1px solid ${th.bdr}`,
      borderRadius: 24,
      boxShadow: dk
        ? "0 -8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)"
        : "0 -8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.6)",
      display: "flex", alignItems: "center", justifyContent: "space-around",
      overflow: "visible",
      padding: "4px 6px",
      animation: "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both",
      animationDelay: "0.1s",
    }}>
      {LINKS.map(link => {
        const Icon = link.icon;
        const isActive = view === link.id;
        const isHighlighted = link.highlighted;
        const activeColor = link.color || "#6366f1";

        return (
          <button
            key={link.id}
            onClick={() => setView(link.id)}
            className="rs-bottom-nav-btn"
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: isHighlighted ? "4px 2px" : "8px 2px 6px", border: "none",
              background: isActive
                ? (isHighlighted ? `${activeColor}15` : `${activeColor}${dk ? "18" : "10"}`)
                : "transparent",
              borderRadius: isHighlighted ? 16 : 14,
              color: isActive ? activeColor : (isHighlighted ? (dk ? "#f3f4f6" : "#1e293b") : th.txt3),
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
                position: "absolute", top: -2, left: "50%", transform: "translateX(-50%)",
                width: isHighlighted ? 26 : 20, height: 3, borderRadius: 99,
                background: activeColor,
                boxShadow: `0 0 10px ${activeColor}`,
              }} />
            )}

            {isHighlighted ? (
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: isActive
                  ? link.bgGradient
                  : (dk ? `${activeColor}22` : `${activeColor}15`),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isActive ? "#fff" : activeColor,
                boxShadow: isActive ? `0 4px 14px ${activeColor}60` : `0 2px 8px ${activeColor}25`,
                marginBottom: 2,
                transition: "all 0.22s ease",
                border: `1.5px solid ${activeColor}${isActive ? "80" : "40"}`,
              }}>
                <Icon size={19} strokeWidth={2.5} />
              </div>
            ) : (
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            )}

            <span style={{
              fontSize: isHighlighted ? 11 : 10,
              fontWeight: isActive || isHighlighted ? 800 : 500,
              marginTop: isHighlighted ? 1 : 4,
              color: isActive ? activeColor : (isHighlighted ? activeColor : th.txt3),
            }}>
              {link.label}
            </span>

            {link.id === "messages" && unreadMsgs > 0 && (
              <span style={{
                position: "absolute", top: 4, right: "calc(50% - 16px)",
                background: "#ef4444", color: "#fff", fontSize: 8, fontWeight: 800,
                padding: "1px 4px", borderRadius: 99, minWidth: 14, height: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 6px rgba(239,68,68,0.6)",
              }}>
                {unreadMsgs}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
