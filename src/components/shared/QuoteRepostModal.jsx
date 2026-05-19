// src/components/shared/QuoteRepostModal.jsx
import { useState } from "react";
import { Repeat2, Edit3, X } from "lucide-react";
import { T } from '../../config/constants.js';
import Av from '../ui/Av.jsx';

function QuoteRepostModal({ post, me, myProfile, profiles, onQuotePost, onSimpleRepost, onClose, dk }) {
  const th = T(dk);
  const [thought, setThought] = useState("");
  const [mode, setMode] = useState("choice"); // choice | quote

  if (mode === "choice") return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: th.surf, borderRadius: 20, padding: 24, width: 300 }}>
        <h3 style={{ margin: "0 0 16px", color: th.txt, fontSize: 16, fontWeight: 700 }}>Repost Options</h3>
        <button onClick={() => { onSimpleRepost(post); onClose(); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 12, cursor: "pointer", marginBottom: 10, color: th.txt }}>
          <Repeat2 size={18} color="#10b981" /><div style={{ textAlign: "left" }}><div style={{ fontWeight: 600, fontSize: 14 }}>Repost</div><div style={{ fontSize: 12, color: th.txt3 }}>Instantly repost to followers</div></div>
        </button>
        <button onClick={() => setMode("quote")} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 12, cursor: "pointer", color: th.txt }}>
          <Edit3 size={18} color="#3b82f6" /><div style={{ textAlign: "left" }}><div style={{ fontWeight: 600, fontSize: 14 }}>Quote Repost</div><div style={{ fontSize: 12, color: th.txt3 }}>Add your thoughts</div></div>
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: th.surf, borderRadius: 20, padding: 24, width: 380 }}>
        <h3 style={{ margin: "0 0 14px", color: th.txt, fontSize: 16, fontWeight: 700 }}>Quote Repost</h3>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <Av profile={myProfile || {}} size={32} />
          <textarea value={thought} onChange={e => setThought(e.target.value)} placeholder="Add your thoughts..." rows={3} style={{ flex: 1, background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "8px 12px", fontSize: 14, outline: "none", resize: "none", fontFamily: "inherit", color: th.txt }} />
        </div>
        <div style={{ background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 10, padding: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: th.txt3, marginBottom: 4 }}>{profiles[post.uid]?.name || "User"}</div>
          <p style={{ margin: 0, fontSize: 13, color: th.txt, lineHeight: 1.5 }}>{(post.text || "").slice(0, 120)}{post.text?.length > 120 ? "…" : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px", background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 10, cursor: "pointer", color: th.txt2, fontWeight: 600 }}>Cancel</button>
          <button onClick={() => { onQuotePost(post, thought); onClose(); }} style={{ flex: 1, padding: "9px", background: "#3b82f6", border: "none", borderRadius: 10, cursor: "pointer", color: "#fff", fontWeight: 700 }}>Quote Repost</button>
        </div>
      </div>
    </div>
  );
}

export default QuoteRepostModal;