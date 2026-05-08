import { useState } from "react";
import { Home, Users, MessageCircle, Repeat2, Share2, X, Bell, LogOut } from "lucide-react";
import { Av, RightSignalLogo, SGN } from "./ui";
import { T, canManageAds } from "../utils/helpers";

// ─── SIDEBAR ──────────────────────────────────────────────────────
export function Sidebar({ view, setView, me, dk, bals, myProfile }) {
  const th = T(dk);
  const bal = bals[me] ?? 0;
  const links = [
    { id: "feed", e: "🏠", l: "Feed" },
    { id: "network", e: "👥", l: "Network" },
    { id: "messages", e: "💬", l: "Messages" },
    { id: "colab", e: "🚀", l: "Colab" },
    { id: "events", e: "📅", l: "Events" },
    { id: "sandbox", e: "💡", l: "Sandbox" },
    { id: "contribute", e: "📝", l: "Contribute" },
    { id: "wallet", e: "◈", l: "Wallet", badge: bal },
    ...(canManageAds(myProfile) ? [{ id: "ads", e: "📢", l: "Ads Manager" }] : []),
  ];
  return (
    <div style={{ width: 190, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid ${th.bdr}`, height: "100vh", position: "sticky", top: 0, background: th.side }}>
      <div style={{ padding: "14px 12px", borderBottom: `1px solid ${th.bdr}` }}>
        <RightSignalLogo size={32} dk={dk} />
      </div>
      <div style={{ padding: "8px", flex: 1, overflowY: "auto" }}>
        {links.map(l => (
          <button key={l.id} onClick={() => setView(l.id)} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 10px", borderRadius: 10, border: "none", background: view === l.id ? dk ? "rgba(59,130,246,.15)" : "#eff6ff" : "transparent", color: view === l.id ? l.id === "wallet" ? "#f59e0b" : "#3b82f6" : th.txt2, fontSize: 13, fontWeight: view === l.id ? 700 : 500, cursor: "pointer", textAlign: "left", marginBottom: 2, borderLeft: view === l.id ? `2px solid ${l.id === "wallet" ? "#f59e0b" : "#3b82f6"}` : "2px solid transparent", transition: "all .15s" }}>
            <span style={{ fontSize: 15 }}>{l.e}</span>
            <span style={{ flex: 1 }}>{l.l}</span>
            {l.badge !== undefined && <span style={{ background: "#f59e0b20", color: "#f59e0b", fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 99, border: "1px solid #f59e0b44" }}>{l.badge}</span>}
          </button>
        ))}
      </div>
      <div style={{ padding: "10px 8px", borderTop: `1px solid ${th.bdr}` }}>
        <button onClick={() => setView("profile")} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer" }}>
          <Av profile={myProfile || {}} size={28} bal={bal} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: th.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{myProfile?.name || "User"}</div>
            <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700 }}>◈ {bal} SGN</div>
          </div>
        </button>
      </div>
    </div>
  );
}

// ─── RIGHT PANEL ──────────────────────────────────────────────────
export function RightPanel({ dk, myProfile, onProfile, bals, onWallet, profiles, onTag }) {
  const th = T(dk);
  const sorted = Object.entries(bals).sort((a, b) => b[1] - a[1]).slice(0, 10);
  return (
    <div style={{ width: 280, borderLeft: `1px solid ${th.bdr}` }}>
      <div style={{ padding: 16, borderBottom: `1px solid ${th.bdr}` }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", color: th.txt }}>Top Earners</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map(([uid, bal], i) => {
            const prof = profiles[uid];
            return (
              <div key={uid} onClick={() => onProfile(uid)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", padding: 8, borderRadius: 8, background: th.surf2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: th.txt2, width: 20 }}>{i + 1}</span>
                  <Av profile={prof || {}} size={24} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: th.txt, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prof?.name || "User"}</div>
                    <div style={{ fontSize: 10, color: th.txt3 }}>@{prof?.handle || uid.slice(0, 8)}</div>
                  </div>
                </div>
                <SGN n={bal} size="sm" />
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ padding: 16, borderBottom: `1px solid ${th.bdr}` }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", color: th.txt }}>Trending Tags</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {["#BuildInPublic", "#RightSignal", "#Founders"].map(tag => (
            <button key={tag} onClick={() => onTag(tag)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: 8, background: th.surf2, border: "none", borderRadius: 8, cursor: "pointer", color: "#3b82f6", fontSize: 12, fontWeight: 600 }}>
              <span>{tag}</span>
              <span style={{ fontSize: 11, color: th.txt3 }}>→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── NOTIFICATION PANEL ───────────────────────────────────────────
export function NotifPanel({ notifs, setNotifs, onClose, dk }) {
  const th = T(dk);
  return (
    <div style={{ position: "absolute", top: 50, right: 10, width: 320, background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 14, boxShadow: "0 4px 32px rgba(0,0,0,.15)", zIndex: 1000 }}>
      <div style={{ padding: 12, borderBottom: `1px solid ${th.bdr}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: th.txt }}>Notifications</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3 }}><X size={16} /></button>
      </div>
      <div style={{ maxHeight: 400, overflowY: "auto" }}>
        {notifs.length === 0 ? (
          <p style={{ padding: 16, textAlign: "center", color: th.txt3, fontSize: 12 }}>No notifications</p>
        ) : (
          notifs.slice(0, 20).map(n => (
            <div key={n.id} style={{ padding: 12, borderBottom: `1px solid ${th.bdr}`, background: n.read ? "transparent" : `${th.bdr}40`, cursor: "pointer" }} onClick={() => setNotifs(ns => ns.map(x => x.id === n.id ? { ...x, read: true } : x))}>
              <div style={{ fontSize: 12, color: th.txt }}>{n.msg}</div>
              <div style={{ fontSize: 11, color: th.txt3, marginTop: 4 }}>{new Date(n.ts).toLocaleDateString()}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
