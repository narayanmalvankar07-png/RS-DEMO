// src/components/shared/ShareModal.jsx
import { useState } from "react";
import { createPortal } from "react-dom";
import { X, MessageCircle, Send, Link2, Check, Share2 } from "lucide-react";
import { T } from '../../config/constants.js';

function ShareModal({ post, onClose, dk }) {
  const th = T(dk);
  const postUrl = `${window.location.origin}?post=${post.id}`;
  const text = encodeURIComponent(`${(post.text || "").slice(0, 100)} — RightSignal`);
  const url = encodeURIComponent(postUrl);
  const [copied, setCopied] = useState(false);

  const shareWhatsApp = () => window.open(`https://wa.me/?text=${text}%20${url}`, "_blank");
  const shareTelegram = () => window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank");
  const copyLink = () => { navigator.clipboard.writeText(postUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const nativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "RightSignal Post", text: post.text || "", url: postUrl }); } catch {}
    }
  };

  const options = [
    {
      label: "WhatsApp",
      color: "#25d366",
      className: "rs-share-whatsapp",
      icon: <MessageCircle size={22} style={{ strokeWidth: 2.2 }} />,
      action: shareWhatsApp
    },
    {
      label: "Telegram",
      color: "#2aabee",
      className: "rs-share-telegram",
      icon: <Send size={22} style={{ strokeWidth: 2.2 }} />,
      action: shareTelegram
    },
    {
      label: copied ? "Copied!" : "Copy Link",
      color: "#8b5cf6",
      className: "rs-share-copy",
      icon: copied ? <Check size={22} style={{ strokeWidth: 2.2 }} /> : <Link2 size={22} style={{ strokeWidth: 2.2 }} />,
      action: copyLink
    },
    {
      label: "Share",
      color: "#ec4899",
      className: "rs-share-native",
      icon: <Share2 size={22} style={{ strokeWidth: 2.2 }} />,
      action: nativeShare
    },
  ];

  return createPortal(
    <div
      className="rs-fade-in"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(3, 5, 12, 0.75)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
      onClick={onClose}
    >
      <style>{`
        .rs-share-card {
          transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .rs-share-card:hover {
          transform: translateY(-4px) scale(1.02);
        }
        .rs-share-whatsapp:hover {
          box-shadow: 0 10px 24px -6px rgba(37, 211, 102, 0.35);
          background: rgba(37, 211, 102, 0.16) !important;
          border-color: rgba(37, 211, 102, 0.45) !important;
        }
        .rs-share-telegram:hover {
          box-shadow: 0 10px 24px -6px rgba(42, 171, 238, 0.35);
          background: rgba(42, 171, 238, 0.16) !important;
          border-color: rgba(42, 171, 238, 0.45) !important;
        }
        .rs-share-copy:hover {
          box-shadow: 0 10px 24px -6px rgba(139, 92, 246, 0.35);
          background: rgba(139, 92, 246, 0.16) !important;
          border-color: rgba(139, 92, 246, 0.45) !important;
        }
        .rs-share-native:hover {
          box-shadow: 0 10px 24px -6px rgba(236, 72, 153, 0.35);
          background: rgba(236, 72, 153, 0.16) !important;
          border-color: rgba(236, 72, 153, 0.45) !important;
        }
      `}</style>
      <div
        className="rs-modal-spring"
        onClick={e => e.stopPropagation()}
        style={{
          background: dk ? "rgba(18, 23, 37, 0.88)" : "rgba(255, 255, 255, 0.94)",
          border: dk ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(99, 102, 241, 0.15)",
          borderRadius: 24,
          padding: 24,
          width: 320,
          boxShadow: dk ? "0 25px 60px -15px rgba(0, 0, 0, 0.65)" : "0 25px 60px -15px rgba(99, 102, 241, 0.16)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: th.txt, letterSpacing: "-0.2px" }}>Share Post</span>
          <button
            onClick={onClose}
            style={{
              background: dk ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              border: "none",
              cursor: "pointer",
              color: th.txt2,
              borderRadius: "50%",
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease"
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "rotate(90deg)"}
            onMouseLeave={e => e.currentTarget.style.transform = "rotate(0deg)"}
          >
            <X size={15} />
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {options.map(({ label, color, className, icon, action }) => (
            <button
              key={label}
              onClick={action}
              className={`rs-share-card ${className}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                padding: "16px 10px",
                background: dk ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
                border: dk ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid rgba(0, 0, 0, 0.06)",
                borderRadius: 16,
                cursor: "pointer",
                color
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 12, background: `${color}14` }}>
                {icon}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: th.txt2 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ShareModal;