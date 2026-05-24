// src/components/shared/QuoteRepostModal.jsx
import { useState } from "react";
import { createPortal } from "react-dom";
import { Repeat2, Edit3, X } from "lucide-react";
import { T } from '../../config/constants.js';
import Av from '../ui/Av.jsx';

function QuoteRepostModal({ post, me, myProfile, profiles, onQuotePost, onSimpleRepost, onClose, dk }) {
  const th = T(dk);
  const [thought, setThought] = useState("");
  const [mode, setMode] = useState("choice"); // choice | quote

  const modalStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(3, 5, 12, 0.75)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  };

  const containerStyle = {
    background: dk ? "rgba(18, 23, 37, 0.88)" : "rgba(255, 255, 255, 0.94)",
    border: dk ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(99, 102, 241, 0.15)",
    borderRadius: 24,
    padding: mode === "choice" ? "32px 24px 24px 24px" : 24,
    width: mode === "choice" ? 330 : 400,
    boxShadow: dk ? "0 25px 60px -15px rgba(0, 0, 0, 0.65)" : "0 25px 60px -15px rgba(99, 102, 241, 0.16)",
    position: "relative",
    transition: "width 0.2s ease"
  };

  const closeButtonStyle = {
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
  };

  if (mode === "choice") return createPortal(
    <div className="rs-fade-in" style={modalStyle} onClick={onClose}>
      <style>{`
        .rs-repost-card {
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .rs-repost-card:hover {
          transform: translateY(-4px) scale(1.02);
        }
        .rs-repost-option-simple:hover {
          box-shadow: 0 10px 24px -6px rgba(16, 185, 129, 0.35);
          background: rgba(16, 185, 129, 0.15) !important;
          border-color: rgba(16, 185, 129, 0.5) !important;
        }
        .rs-repost-option-simple:hover .rs-repost-icon {
          transform: rotate(180deg);
        }
        .rs-repost-option-quote:hover {
          box-shadow: 0 10px 24px -6px rgba(59, 130, 246, 0.35);
          background: rgba(59, 130, 246, 0.15) !important;
          border-color: rgba(59, 130, 246, 0.5) !important;
        }
        .rs-repost-option-quote:hover .rs-quote-icon {
          transform: rotate(-12deg) translateY(-2px) scale(1.05);
        }
        .rs-repost-icon, .rs-quote-icon {
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
      <div className="rs-modal-spring" onClick={e => e.stopPropagation()} style={containerStyle}>
        <button
          onClick={onClose}
          style={{ ...closeButtonStyle, position: "absolute", top: 12, right: 12 }}
          onMouseEnter={e => e.currentTarget.style.transform = "rotate(90deg)"}
          onMouseLeave={e => e.currentTarget.style.transform = "rotate(0deg)"}
        >
          <X size={15} />
        </button>

        <button
          onClick={() => { onSimpleRepost(post); onClose(); }}
          className="rs-repost-card rs-repost-option-simple"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            width: "100%",
            padding: "16px 20px",
            background: dk ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
            border: dk ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid rgba(0, 0, 0, 0.06)",
            borderRadius: 16,
            cursor: "pointer",
            marginBottom: 12,
            color: th.txt
          }}
        >
          <div className="rs-repost-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 42, height: 42, borderRadius: 12, background: "rgba(16, 185, 129, 0.12)" }}>
            <Repeat2 size={20} color="#10b981" style={{ strokeWidth: 2.2 }} />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: th.txt }}>Repost</div>
            <div style={{ fontSize: 12, color: th.txt3, marginTop: 2 }}>Instantly repost to followers</div>
          </div>
        </button>

        <button
          onClick={() => setMode("quote")}
          className="rs-repost-card rs-repost-option-quote"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            width: "100%",
            padding: "16px 20px",
            background: dk ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
            border: dk ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid rgba(0, 0, 0, 0.06)",
            borderRadius: 16,
            cursor: "pointer",
            color: th.txt
          }}
        >
          <div className="rs-quote-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 42, height: 42, borderRadius: 12, background: "rgba(59, 130, 246, 0.12)" }}>
            <Edit3 size={20} color="#3b82f6" style={{ strokeWidth: 2.2 }} />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: th.txt }}>Quote Repost</div>
            <div style={{ fontSize: 12, color: th.txt3, marginTop: 2 }}>Add your thoughts</div>
          </div>
        </button>
      </div>
    </div>,
    document.body
  );

  return createPortal(
    <div className="rs-fade-in" style={modalStyle} onClick={onClose}>
      <style>{`
        .rs-quote-textarea:focus {
          border-color: rgba(99, 102, 241, 0.6) !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18) !important;
        }
        .rs-btn-quote-submit:hover {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%) !important;
          box-shadow: 0 8px 20px -4px rgba(99, 102, 241, 0.4) !important;
        }
      `}</style>
      <div className="rs-modal-spring" onClick={e => e.stopPropagation()} style={containerStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: th.txt, letterSpacing: "-0.2px" }}>Quote Repost</span>
          <button
            onClick={onClose}
            style={closeButtonStyle}
            onMouseEnter={e => e.currentTarget.style.transform = "rotate(90deg)"}
            onMouseLeave={e => e.currentTarget.style.transform = "rotate(0deg)"}
          >
            <X size={15} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <Av profile={myProfile || {}} size={36} />
          <textarea
            value={thought}
            onChange={e => setThought(e.target.value)}
            placeholder="Add your thoughts..."
            rows={3}
            className="rs-quote-textarea"
            style={{
              flex: 1,
              background: dk ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.02)",
              border: dk ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
              borderRadius: 14,
              padding: "10px 14px",
              fontSize: 14,
              outline: "none",
              resize: "none",
              fontFamily: "inherit",
              color: th.txt,
              transition: "all 0.2s ease"
            }}
          />
        </div>

        {/* Quoted post card */}
        <div
          style={{
            background: dk ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
            border: dk ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid rgba(0, 0, 0, 0.05)",
            borderRadius: 14,
            padding: 14,
            marginBottom: 20
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: th.txt2 }}>
              {profiles[post.uid]?.name || "User"}
            </span>
            <span style={{ fontSize: 12, color: th.txt3 }}>
              @{profiles[post.uid]?.username || "user"}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: th.txt2, lineHeight: 1.5 }}>
            {(post.text || "").slice(0, 120)}
            {post.text?.length > 120 ? "…" : ""}
          </p>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "11px",
              background: "transparent",
              border: dk ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
              borderRadius: 12,
              cursor: "pointer",
              color: th.txt2,
              fontWeight: 700,
              fontSize: 13,
              transition: "all 0.15s ease"
            }}
            onMouseEnter={e => e.currentTarget.style.background = dk ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            Cancel
          </button>
          <button
            onClick={() => { onQuotePost(post, thought); onClose(); }}
            className="rs-btn-quote-submit"
            style={{
              flex: 1,
              padding: "11px",
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
              color: "#fff",
              fontWeight: 800,
              fontSize: 13,
              transition: "all 0.2s ease"
            }}
          >
            Quote Repost
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default QuoteRepostModal;