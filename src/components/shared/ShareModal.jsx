// src/components/shared/ShareModal.jsx
import { useState } from "react";
import { X } from "lucide-react";
import { T } from '../../config/constants.js';

function ShareModal({ post, onClose, dk }) {
  const th = T(dk);
  const text = encodeURIComponent(`${(post.text || "").slice(0, 100)} — RightSignal`);
  const url = encodeURIComponent(window.location.href);
  const [copied, setCopied] = useState(false);

  const shareWhatsApp = () => window.open(`https://wa.me/?text=${text}%20${url}`, "_blank");
  const shareTelegram = () => window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank");
  const copyLink = () => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const nativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "RightSignal Post", text: post.text || "", url: window.location.href }); } catch {}
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: th.surf, borderRadius: 20, padding: 24, width: 320, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: th.txt }}>Share Post</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3 }}><X size={18} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "WhatsApp", color: "#25d366", icon: "💬", action: shareWhatsApp },
            { label: "Telegram", color: "#2aabee", icon: "✈️", action: shareTelegram },
            { label: copied ? "Copied!" : "Copy Link", color: "#6b7280", icon: "🔗", action: copyLink },
            { label: "Share", color: "#8b5cf6", icon: "📤", action: nativeShare },
          ].map(({ label, color, icon, action }) => (
            <button key={label} onClick={action} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 10px", background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 14, cursor: "pointer", color }}>
              <span style={{ fontSize: 24 }}>{icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ShareModal;