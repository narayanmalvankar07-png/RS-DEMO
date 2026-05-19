import { useEffect } from "react";
import { X, CheckCheck } from "lucide-react";
import { T } from "../../config/constants.js";

export default function NotifPanel({ notifs, setNotifs, onClose, dk, onPoll }) {
  const th = T(dk);
  const panelBg  = dk ? "rgba(10, 14, 30, 0.96)" : "rgba(255, 255, 255, 0.95)";
  const hdrBdr   = dk ? "rgba(255,255,255,0.10)"  : "rgba(0,0,0,0.08)";
  const unreadBg = dk ? "rgba(99,102,241,0.12)"   : "rgba(99,102,241,0.07)";

  useEffect(() => {
    if (!onPoll) return;
    const t = setInterval(onPoll, 15000);
    return () => clearInterval(t);
  }, [onPoll]);

  const markAll = () => setNotifs(ns => ns.map(n => ({ ...n, read: true })));
  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <div style={{ position: "absolute", top: 52, right: 10, width: 320, background: panelBg, backdropFilter: "blur(24px) saturate(1.8)", WebkitBackdropFilter: "blur(24px) saturate(1.8)", border: `1px solid ${hdrBdr}`, borderRadius: 18, boxShadow: dk ? "0 24px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)" : "0 16px 48px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.9)", zIndex: 1000, animation: "scaleIn 0.22s cubic-bezier(0.22,1,0.36,1) both", transformOrigin: "top right" }}>
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${hdrBdr}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: th.txt }}>Notifications</span>
          {unreadCount > 0 && (
            <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99, animation: "notifPop 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>{unreadCount}</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {unreadCount > 0 && (
            <button onClick={markAll} title="Mark all as read" style={{ border: "none", background: dk ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)", cursor: "pointer", color: "#6366f1", padding: "4px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <CheckCheck size={13} /> All read
            </button>
          )}
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: th.txt2, display: "flex", alignItems: "center", padding: 4 }}><X size={16} /></button>
        </div>
      </div>
      <div style={{ maxHeight: 380, overflowY: "auto" }}>
        {notifs.length === 0 ? (
          <div style={{ padding: 28, textAlign: "center", color: th.txt3 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
            <div style={{ fontSize: 12, fontWeight: 500 }}>You're all caught up!</div>
          </div>
        ) : notifs.map((n, i) => (
          <button key={n.id} onClick={() => setNotifs(ns => ns.map(x => x.id === n.id ? { ...x, read: true } : x))}
            style={{ width: "100%", textAlign: "left", padding: "12px 14px", border: "none", background: n.read ? "transparent" : unreadBg, cursor: "pointer", borderBottom: `1px solid ${hdrBdr}`, transition: "background 0.18s", animation: `fadeUp 0.32s cubic-bezier(0.22,1,0.36,1) ${i * 30}ms both` }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              {!n.read && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", flexShrink: 0, marginTop: 4, boxShadow: "0 0 6px #6366f1" }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: th.txt, fontWeight: n.read ? 400 : 600, lineHeight: 1.4 }}>{n.msg}</div>
                <div style={{ fontSize: 11, color: th.txt3, marginTop: 3 }}>{new Date(n.ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
