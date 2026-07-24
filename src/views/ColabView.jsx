import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  PlusCircle, Search, ArrowLeft, Globe, Github, Twitter, Linkedin, Copy, Check, CheckCircle2, X, Send, FileText, Edit2, Trash2, ChevronRight, ChevronDown, Lock, Key, MessageSquare, Megaphone, Calendar, Video, Users, Reply, LogIn, LogOut, Upload, Loader2,
  Rocket, Code, CircleDollarSign, Handshake, Terminal, Palette, Award, Crown, Shield, ShieldAlert, User, ListTodo, FolderOpen, Activity, Camera, Compass, BookOpen,
  Bookmark, CreditCard, Smartphone, Wallet, Star, Sparkles
} from "lucide-react";
import { T } from "../config/constants.js";
import { db } from "../services/supabase.js";
import { ago, strColor, isPlanActive } from "../utils/helpers.js";
import { processAndUploadImage } from "../utils/uploadImage.js";
import Card from "../components/ui/Card.jsx";
import Av from "../components/ui/Av.jsx";
import Spin from "../components/ui/Spin.jsx";
import ProfileView from "./ProfileView.jsx";
import UpgradeToUnlockCard from "../components/shared/UpgradeToUnlockCard.jsx";


// ─── Logo renderer ─────────────────────────────────────────────────
function Logo({ name, src, size = 56, radius = 16, fontSize = 28 }) {
  const isImg = src && (src.startsWith("data:") || src.startsWith("http"));
  if (isImg) {
    return (
      <div style={{ width: size, height: size, borderRadius: radius, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
        <img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="logo" />
      </div>
    );
  }

  const initials = name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "";
  const finalLogoText = initials || (src && !src.startsWith("data:") && !src.startsWith("http") ? src : "RS");

  const hash = name ? [...name].reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
  const hues = [220, 260, 320, 140, 35, 185];
  const baseHue = hues[hash % hues.length];
  const gradient = `linear-gradient(135deg, hsl(${baseHue}, 75%, 55%), hsl(${(baseHue + 35) % 360}, 80%, 45%))`;

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: radius,
      background: gradient,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: initials ? fontSize : fontSize * 0.8,
      fontWeight: 800,
      color: "#fff",
      flexShrink: 0,
      overflow: "hidden",
      boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
      textShadow: "0 1px 3px rgba(0,0,0,0.2)"
    }}>
      {finalLogoText}
    </div>
  );
}

// ─── Constants ─────────────────────────────────────────────────────
const COLAB_COUNTRIES = [
  { iso: "us", code: "+1", name: "US/CA" }, { iso: "gb", code: "+44", name: "UK" },
  { iso: "in", code: "+91", name: "IN" }, { iso: "au", code: "+61", name: "AU" },
  { iso: "cn", code: "+86", name: "CN" }, { iso: "de", code: "+49", name: "DE" },
  { iso: "fr", code: "+33", name: "FR" }, { iso: "jp", code: "+81", name: "JP" },
  { iso: "br", code: "+55", name: "BR" }, { iso: "ae", code: "+971", name: "AE" },
  { iso: "sa", code: "+966", name: "SA" }, { iso: "sg", code: "+65", name: "SG" },
  { iso: "za", code: "+27", name: "ZA" }, { iso: "ng", code: "+234", name: "NG" },
  { iso: "mx", code: "+52", name: "MX" }, { iso: "id", code: "+62", name: "ID" },
  { iso: "it", code: "+39", name: "IT" }, { iso: "es", code: "+34", name: "ES" },
  { iso: "nl", code: "+31", name: "NL" }, { iso: "se", code: "+46", name: "SE" },
  { iso: "ch", code: "+41", name: "CH" }, { iso: "kr", code: "+82", name: "KR" },
  { iso: "tr", code: "+90", name: "TR" }, { iso: "ar", code: "+54", name: "AR" },
  { iso: "co", code: "+57", name: "CO" }, { iso: "ph", code: "+63", name: "PH" },
  { iso: "vn", code: "+84", name: "VN" }, { iso: "pk", code: "+92", name: "PK" },
  { iso: "bd", code: "+880", name: "BD" }, { iso: "ru", code: "+7", name: "RU" },
  { iso: "eg", code: "+20", name: "EG" }, { iso: "ke", code: "+254", name: "KE" },
  { iso: "gh", code: "+233", name: "GH" }, { iso: "ca", code: "+1", name: "CA" },
  { iso: "nz", code: "+64", name: "NZ" }, { iso: "ie", code: "+353", name: "IE" },
  { iso: "il", code: "+972", name: "IL" }, { iso: "my", code: "+60", name: "MY" },
  { iso: "th", code: "+66", name: "TH" }
];

const genRefCode = n => n.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();

const PAGE_TYPES = [
  { id: "community", label: "Community", desc: "Public audience — announcements, community engagement", c: "#3b82f6", icon: Globe, e: "🌐" },
  { id: "product", label: "Product", desc: "Product updates & roadmap", c: "#10b981", icon: Rocket, e: "🚀" },
  { id: "tech", label: "Tech", desc: "Engineers — dev logs, architecture, code discussions", c: "#8b5cf6", icon: Code, e: "💻" },
  { id: "investment", label: "Investment", desc: "Investors & advisors — pitch decks, funding updates, traction", c: "#f59e0b", icon: CircleDollarSign, e: "💰" },
  { id: "marketing", label: "Marketing", desc: "Growth team — campaigns, content strategy, analytics", c: "#ec4899", icon: Megaphone, e: "📣" },
  { id: "sales", label: "Sales", desc: "Sales team — deals, pipeline, customer outreach", c: "#06b6d4", icon: Handshake, e: "🤝" },
];

const JOIN_ROLES = [
  { id: "developer", label: "Developer", icon: Terminal, c: "#3b82f6", e: "⚡" },
  { id: "designer", label: "Designer", icon: Palette, c: "#ec4899", e: "🎨" },
  { id: "marketer", label: "Marketer", icon: Megaphone, c: "#f97316", e: "📢" },
  { id: "investor", label: "Investor", icon: CircleDollarSign, c: "#10b981", e: "💰" },
  { id: "advisor", label: "Advisor", icon: Award, c: "#8b5cf6", e: "🎯" },
  { id: "cofounder", label: "Co-Founder", icon: Crown, c: "#ef4444", e: "🚀" },
];

// Maps join role → page type_id (null = all pages, undefined = no auto-page)
const ROLE_PAGE_MAP = {
  developer: "tech",
  designer: "product",
  marketer: "marketing",
  investor: "investment",
  advisor: "investment",
  cofounder: null,
};

// Default pages created automatically when a colab is launched
// One page per JOIN_ROLE, named exactly after the role
const DEFAULT_ROLE_PAGES = [
  { name: "Developer", type_id: "tech", description: "Engineers — dev logs, architecture, code discussions" },
  { name: "Designer", type_id: "product", description: "Design team — UI/UX, prototypes, product vision" },
  { name: "Marketer", type_id: "marketing", description: "Growth team — campaigns, content strategy, analytics" },
  { name: "Investor", type_id: "investment", description: "Investors & advisors — pitch decks, funding updates, traction" },
  { name: "Advisor", type_id: "investment", description: "Advisors — strategic guidance and mentorship" },
  { name: "Co-Founder", type_id: "community", description: "Co-founders — shared vision, leadership and decisions" },
];

// Per-page-type request config — each page has its own question/context
const PAGE_REQUEST_CONFIG = {
  community: { icon: "🌐", question: "How will you contribute to the community?", placeholder: "Share ideas, help members, moderate discussions, grow the audience…", color: "#3b82f6" },
  product: { icon: "🚀", question: "What product skills do you bring?", placeholder: "UX/UI design, roadmap planning, user research, prototyping…", color: "#10b981" },
  tech: { icon: "🤖", question: "What is your technical background?", placeholder: "Languages, frameworks, open-source projects, relevant experience…", color: "#8b5cf6" },
  investment: { icon: "💰", question: "What is your investment or advisory background?", placeholder: "Stage focus, sector expertise, ticket size, portfolio companies…", color: "#f59e0b" },
  marketing: { icon: "📣", question: "What is your marketing experience?", placeholder: "Growth hacking, content, SEO, paid ads, brand strategy, campaigns…", color: "#ec4899" },
  sales: { icon: "🤝", question: "What sales experience do you have?", placeholder: "B2B/B2C, enterprise deals, partnerships, pipeline management…", color: "#06b6d4" },
};

// ─── Local storage helpers ──────────────────────────────────────────
const ls = {
  get: (k, def = []) => { try { return JSON.parse(localStorage.getItem(k) ?? "null") ?? def; } catch { return def; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
};

// ─── CopyBtn ───────────────────────────────────────────────────────
function CopyBtn({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch { }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} style={{ display: "flex", alignItems: "center", gap: 5, background: copied ? "#10b98118" : "rgba(255,255,255,0.07)", border: `1px solid ${copied ? "#10b98140" : "rgba(255,255,255,0.12)"}`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: copied ? "#10b981" : "#94a3b8", fontSize: 12, fontWeight: 600 }}>
      {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? "Copied!" : label}
    </button>
  );
}

// ─── ColabGlassSelect Component ────────────────────────────────────────
function ColabGlassSelect({ value, onChange, options, dk, th }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [open]);

  const selectedOpt = options.find(opt => opt.value === value) || options[0];

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "9px 12px",
          borderRadius: 10,
          border: `1px solid ${th.inpB}`,
          background: th.inp,
          color: th.txt,
          fontSize: 13,
          boxSizing: "border-box",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          userSelect: "none",
          transition: "border-color 0.2s"
        }}
      >
        <span>{selectedOpt?.label || value}</span>
        <span style={{
          transform: open ? "rotate(180deg)" : "rotate(0)",
          transition: "transform 0.2s",
          fontSize: 8,
          color: th.txt3,
          display: "inline-block"
        }}>
          ▼
        </span>
      </div>

      {/* Dropdown Options List */}
      {open && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 5px)",
          left: 0,
          right: 0,
          background: th.side || th.surf || "rgba(13,20,38,0.97)",
          backdropFilter: th.blur,
          WebkitBackdropFilter: th.blur,
          border: `1px solid ${th.bdr}`,
          borderRadius: 10,
          boxShadow: "0 -10px 25px rgba(0, 0, 0, 0.3)",
          zIndex: 100,
          maxHeight: 200,
          overflowY: "auto",
          padding: 4
        }}>
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={`${opt.value}-${idx}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  color: isSelected ? "#6366f1" : th.txt2,
                  background: isSelected ? (dk ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.08)") : "transparent",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  fontWeight: isSelected ? 600 : 500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = dk ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)";
                    e.currentTarget.style.color = th.txt;
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = th.txt2;
                  }
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <span style={{ color: "#6366f1", fontSize: 10 }}>✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── GlassDropdown Component ──────────────────────────────────────────
function GlassDropdown({ value, onChange, options, dk, style = {}, width = "100%" }) {
  const [isOpen, setIsOpen] = useState(false);
  const th = T(dk);
  const activeOpt = options.find(o => o.id === value) || options[0];

  return (
    <div style={{ position: "relative", width, zIndex: isOpen ? 10001 : 1, ...style }}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: th.surf,
          backdropFilter: th.blur,
          WebkitBackdropFilter: th.blur,
          border: `1px solid ${th.bdr}`,
          borderRadius: 12,
          padding: "9px 14px",
          fontSize: 13,
          color: th.txt,
          cursor: "pointer",
          outline: "none",
          transition: "all 0.2s ease",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {activeOpt.icon ? (
            <activeOpt.icon size={15} color={activeOpt.c || th.txt2} />
          ) : activeOpt.e ? (
            <span style={{ fontSize: 13, display: "inline-flex", alignSelf: "center" }}>{activeOpt.e}</span>
          ) : null}
          <span style={{ fontWeight: 600 }}>{activeOpt.label}</span>
        </div>
        <ChevronDown size={13} color={th.txt3} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>

      {/* Backdrop Click Overlay to Close */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            background: "transparent"
          }}
        />
      )}

      {/* Floating Options Menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: dk ? "rgba(13,22,46,0.92)" : "rgba(255, 255, 255, 0.95)",
            backdropFilter: th.blur,
            WebkitBackdropFilter: th.blur,
            border: `1px solid ${th.bdr}`,
            borderRadius: 14,
            padding: 5,
            boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
            zIndex: 1000,
            animation: "fadeUp 0.18s cubic-bezier(0.16, 1, 0.3, 1) both",
            maxHeight: 250,
            overflowY: "auto",
            scrollbarWidth: "thin"
          }}
        >
          {options.map(opt => {
            const isSelected = opt.id === value;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                }}
                type="button"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: isSelected
                    ? (dk ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)")
                    : "transparent",
                  border: "none",
                  borderRadius: 9,
                  padding: "9px 12px",
                  color: isSelected ? (opt.c || th.txt) : th.txt2,
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: 13,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                  boxSizing: "border-box"
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)";
                    e.currentTarget.style.color = th.txt;
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = th.txt2;
                  }
                }}
              >
                {opt.icon ? (
                  <opt.icon size={15} color={opt.c || th.txt3} />
                ) : opt.e ? (
                  <span style={{ fontSize: 13, display: "inline-flex", alignSelf: "center" }}>{opt.e}</span>
                ) : null}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt.label}</div>
                  {opt.desc && (
                    <div style={{ fontSize: 10, color: th.txt3, fontWeight: 400, marginTop: 2, whiteSpace: "normal" }}>
                      {opt.desc}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── User Profile Panel (mini) ─────────────────────────────────────
function UserProfilePanel({ profile, userId, dk, onClose }) {
  const th = T(dk);
  const ROLE_MAP = { developer: { e: "⚡", c: "#3b82f6" }, designer: { e: "🎨", c: "#ec4899" }, marketer: { e: "📢", c: "#f97316" }, investor: { e: "💰", c: "#10b981" }, advisor: { e: "🎯", c: "#8b5cf6" }, cofounder: { e: "🚀", c: "#ef4444" } };
  const p = profile || { name: "User" };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: dk ? "rgba(13,20,38,0.97)" : "#fff", backdropFilter: "blur(20px)", border: `1px solid ${th.bdr}`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 340, animation: "fadeUp 0.2s ease both" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3 }}><X size={16} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 18 }}>
          <Av profile={p} size={70} />
          <div style={{ fontWeight: 800, fontSize: 18, color: th.txt, marginTop: 12 }}>{p.name || "User"}</div>
          {p.handle && <div style={{ fontSize: 13, color: th.txt3, marginTop: 2 }}>@{p.handle}</div>}
          {p.location && <div style={{ fontSize: 12, color: th.txt2, display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}><span>📍</span> {p.location}</div>}
          {p.bio && <p style={{ fontSize: 13, color: th.txt2, marginTop: 8, lineHeight: 1.5, maxWidth: 260 }}>{p.bio}</p>}
        </div>
        {p.role && (
          <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {(Array.isArray(p.role) ? p.role : [p.role]).map(r => {
              const rm = ROLE_MAP[r] || { e: "👤", c: th.txt3 };
              return <span key={r} style={{ background: `${rm.c}18`, color: rm.c, fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 8, border: `1px solid ${rm.c}30` }}>{rm.e} {r}</span>;
            })}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {p.twitter && <a href={p.twitter} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#1da1f2", fontWeight: 600, textDecoration: "none" }}>Twitter ↗</a>}
          {p.linkedin && <a href={p.linkedin} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#0a66c2", fontWeight: 600, textDecoration: "none" }}>LinkedIn ↗</a>}
          {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: th.txt2, fontWeight: 600, textDecoration: "none" }}>Website ↗</a>}
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${th.bdr}`, textAlign: "center" }}>
          <span style={{ fontSize: 11, color: th.txt3, fontFamily: "monospace" }}>ID: {userId?.slice(0, 12)}…</span>
        </div>
      </div>
    </div>
  );
}

// ─── Shared Feedback Section ────────────────────────────────────────
function FeedbackSection({ startupId, me, profiles, dk }) {
  const th = T(dk);
  const FB_KEY = `rs_fb_${startupId}`;
  const [feedbacks, setFeedbacks] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    (async () => {
      const remote = await db.get("rs_startup_feedback", `startup_id=eq.${startupId}&order=created_at.desc`);
      const local = ls.get(FB_KEY, []);
      const remoteIds = new Set((remote || []).map(f => f.id));
      const merged = [...(remote || []), ...local.filter(f => !remoteIds.has(f.id))];
      merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setFeedbacks(merged);
    })();
  }, [startupId]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    const saved = await db.post("rs_startup_feedback", { startup_id: startupId, user_id: me, content: text.trim() });
    const fb = saved || { id: `local_${Date.now()}`, startup_id: startupId, user_id: me, content: text.trim(), created_at: new Date().toISOString() };
    if (!saved) { const loc = ls.get(FB_KEY, []); ls.set(FB_KEY, [fb, ...loc]); }
    setFeedbacks(f => [fb, ...f]);
    setText("");
    setSending(false);
  };

  if (!visible) return (
    <button onClick={() => setVisible(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "8px 14px", color: th.txt3, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 24 }}>
      <MessageSquare size={14} /> Show Feedback
    </button>
  );

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${th.bdr}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <MessageSquare size={16} color={th.txt2} />
            <span style={{ fontSize: 15, fontWeight: 700, color: th.txt }}>Feedback{feedbacks.length > 0 ? ` (${feedbacks.length})` : ""}</span>
          </div>
          <button onClick={() => setVisible(false)} style={{ width: 26, height: 26, borderRadius: "50%", background: dk ? "rgba(255,255,255,0.07)" : "#f1f5f9", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: th.txt3 }}><X size={13} /></button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${th.bdr}` }}>
          <Av profile={profiles[me] || { name: "Me" }} size={34} />
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && text.trim()) { e.preventDefault(); send(); } }} placeholder="Share your feedback..." style={{ flex: 1, background: dk ? "rgba(255,255,255,0.06)" : "#f8fafc", border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "9px 14px", fontSize: 13, outline: "none", color: th.txt, fontFamily: "inherit" }} data-testid="input-feedback" />
          <button onClick={send} disabled={!text.trim() || sending} style={{ flexShrink: 0, background: text.trim() ? "#6366f1" : dk ? "rgba(255,255,255,0.07)" : "#f1f5f9", border: "none", borderRadius: 10, padding: "9px 16px", color: text.trim() ? "#fff" : th.txt3, fontWeight: 700, fontSize: 13, cursor: text.trim() ? "pointer" : "default", transition: "all 0.2s" }} data-testid="button-send-feedback">{sending ? "…" : "Send"}</button>
        </div>
        {feedbacks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 16px", color: th.txt3, fontSize: 13 }}>No feedback yet. Be first!</div>
        ) : (
          <div style={{ padding: "4px 0" }}>
            {feedbacks.map((fb, idx) => {
              const prof = profiles[fb.user_id] || { name: "User" };
              return (
                <div key={fb.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 16px", borderTop: idx === 0 ? "none" : `1px solid ${th.bdr}` }}>
                  <Av profile={prof} size={34} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: th.txt }}>{prof.name || "User"}</span>
                      <span style={{ fontSize: 11, color: th.txt3 }}>{fb.created_at ? ago(new Date(fb.created_at).getTime()) : ""}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: th.txt2, lineHeight: 1.55 }}>{fb.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page Chat View (WhatsApp-style) ───────────────────────────────
function PageChatView({ page, startup, me, profiles, pageMembers = [], allMembers = [], isFounder = false, dk, onBack, onAddPageMember = () => { }, addNotif }) {
  const th = T(dk);
  const pt = PAGE_TYPES.find(p => p.id === page.type_id) || PAGE_TYPES[0];
  const pgMems = pageMembers.filter(m => m.page_id === page.id);

  const [pageTab, setPageTab] = useState("chat");
  const [viewingProf, setViewingProf] = useState(null);

  // Chat
  const MSG_KEY = `rs_msgs_${page.id}`;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const bottomRef = useRef(null);

  // Tasks
  const TASK_KEY = `rs_tasks_${page.id}`;
  const [tasks, setTasks] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", assignee_id: "", priority: "medium" });

  const assigneeOptions = [
    { id: "", label: "Assign to…", icon: User },
    ...pgMems.map(m => {
      const p = profiles[m.user_id] || { name: "Member" };
      return { id: m.user_id, label: p.name, icon: User };
    })
  ];
  const priorityOptions = [
    { id: "low", label: "Low Priority", e: "🟢" },
    { id: "medium", label: "Medium Priority", e: "🟡" },
    { id: "high", label: "High Priority", e: "🔴" }
  ];

  // Files
  const FILE_KEY = `rs_files_${page.id}`;
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  // Meetings
  const MTG_KEY = `rs_mtg_${page.id}`;
  const [meetings, setMeetings] = useState([]);
  const [showMtgForm, setShowMtgForm] = useState(false);
  const [mtgForm, setMtgForm] = useState({ title: "", date: "", time: "", platform: "google_meet", link: "", agenda: "", with_note: "" });

  // Page member roles
  const ROLES_KEY = `rs_pg_page_roles_${page.id}`;
  const [pageRoles, setPageRoles] = useState({});

  // Calendly
  const CALENDLY_KEY = `rs_calendly_${page.id}`;
  const [calendlyUrl, setCalendlyUrl] = useState("");
  const [editCalendly, setEditCalendly] = useState(false);
  const [calendlyInput, setCalendlyInput] = useState("");

  // Member search
  const [memberSearch, setMemberSearch] = useState("");

  // File preview
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    (async () => {
      const [remoteMessages, remoteTasks, remoteFiles, remoteMeetings, remoteRoles, remoteSettings] = await Promise.all([
        db.get("rs_page_messages", `page_id=eq.${page.id}&order=created_at.asc&limit=200`),
        db.get("rs_page_tasks", `page_id=eq.${page.id}&order=created_at.asc`),
        db.get("rs_page_files", `page_id=eq.${page.id}&order=created_at.desc`),
        db.get("rs_page_meetings", `page_id=eq.${page.id}&order=meeting_date.asc`),
        db.get("rs_page_member_roles", `page_id=eq.${page.id}`),
        db.get("rs_page_settings", `page_id=eq.${page.id}&limit=1`),
      ]);

      if (remoteMessages?.length) setMessages(remoteMessages);
      else setMessages(ls.get(MSG_KEY, []));

      if (remoteTasks?.length) setTasks(remoteTasks);
      else setTasks(ls.get(TASK_KEY, []));

      if (remoteFiles?.length) setFiles(remoteFiles);
      else setFiles(ls.get(FILE_KEY, []));

      if (remoteMeetings?.length) setMeetings(remoteMeetings);
      else setMeetings(ls.get(MTG_KEY, []));

      if (remoteRoles?.length) {
        const map = {};
        remoteRoles.forEach(r => { map[r.user_id] = r.role_id; });
        setPageRoles(map);
      } else {
        setPageRoles(ls.get(ROLES_KEY, {}));
      }

      const settings = remoteSettings?.[0];
      if (settings) {
        setCalendlyUrl(settings.calendly_url || "");
        setCalendlyInput(settings.calendly_url || "");
      } else {
        const cached = ls.get(CALENDLY_KEY, "");
        setCalendlyUrl(cached);
        setCalendlyInput(cached);
      }
    })();
  }, [page.id]);

  useEffect(() => { if (pageTab === "chat") bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, pageTab]);

  const sendMsg = async () => {
    if (!text.trim()) return;
    setSending(true);
    const payload = { page_id: page.id, startup_id: startup.id, user_id: me, content: text.trim(), reply_to_id: replyTo?.id || null, reply_to_content: replyTo?.content || null, reply_to_user: replyTo?.user_id || null };
    const saved = await db.post("rs_page_messages", payload);
    const msg = saved || { id: `local_${Date.now()}`, ...payload, created_at: new Date().toISOString() };
    if (!saved) { const loc = ls.get(MSG_KEY, []); ls.set(MSG_KEY, [...loc, msg]); }
    setMessages(m => [...m, msg]);
    setText(""); setReplyTo(null); setSending(false);
  };

  const addTask = () => {
    if (!taskForm.title.trim()) return;
    const task = { id: `task_${Date.now()}`, page_id: page.id, title: taskForm.title.trim(), assignee_id: taskForm.assignee_id, priority: taskForm.priority, status: "todo", created_by: me, created_at: new Date().toISOString() };
    (async () => { await db.post("rs_page_tasks", task); })();
    const updated = [...tasks, task]; setTasks(updated); ls.set(TASK_KEY, updated);
    setTaskForm({ title: "", assignee_id: "", priority: "medium" }); setShowTaskForm(false);
  };

  const cycleTask = (taskId) => {
    const cycle = { todo: "in_progress", in_progress: "done", done: "todo" };
    const updated = tasks.map(t => t.id === taskId ? { ...t, status: cycle[t.status] } : t);
    const next = updated.find(t => t.id === taskId);
    if (next) db.patch("rs_page_tasks", `id=eq.${taskId}`, { status: next.status });
    setTasks(updated); ls.set(TASK_KEY, updated);
  };

  const deleteTask = (id) => { db.del("rs_page_tasks", `id=eq.${id}`); const u = tasks.filter(t => t.id !== id); setTasks(u); ls.set(TASK_KEY, u); };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const url = await processAndUploadImage(file, { bucket: 'attachments' });
      const entry = { id: `file_${Date.now()}`, name: file.name, size: file.size, type: file.type, uploaded_by: me, created_at: new Date().toISOString(), dataUrl: url };
      db.post("rs_page_files", { page_id: page.id, startup_id: startup.id, name: file.name, size: file.size, type: file.type, uploaded_by: me, data_url: url });
      const u = [...files, entry]; setFiles(u); ls.set(FILE_KEY, u);
    } catch (err) {
      console.error("File upload failed", err);
    }
    e.target.value = "";
  };
  const deleteFile = (id) => { db.del("rs_page_files", `id=eq.${id}`); const u = files.filter(f => f.id !== id); setFiles(u); ls.set(FILE_KEY, u); };

  const bookMeeting = async () => {
    if (!mtgForm.title.trim() || !mtgForm.date || !mtgForm.time) return;
    const payload = { page_id: page.id, startup_id: startup.id, created_by: me, title: mtgForm.title.trim(), meeting_date: mtgForm.date, meeting_time: mtgForm.time, platform: mtgForm.platform, link: mtgForm.link.trim(), agenda: mtgForm.agenda.trim(), with_note: mtgForm.with_note.trim() };
    const saved = await db.post("rs_page_meetings", payload);
    const mtg = saved || { id: `local_${Date.now()}`, ...payload, created_at: new Date().toISOString() };
    if (!saved) { const loc = ls.get(MTG_KEY, []); ls.set(MTG_KEY, [...loc, mtg]); }
    setMeetings(m => [...m, mtg]); setMtgForm({ title: "", date: "", time: "", platform: "google_meet", link: "", agenda: "", with_note: "" }); setShowMtgForm(false);
  };

  const setMemberRole = (userId, role) => { const u = { ...pageRoles, [userId]: role }; setPageRoles(u); ls.set(ROLES_KEY, u); db.upsert("rs_page_member_roles", { startup_id: startup.id, page_id: page.id, user_id: userId, role_id: role }); };

  const isPageAdmin = isFounder || pageRoles[me] === "admin";

  const saveCalendlyUrl = () => {
    const url = calendlyInput.trim();
    setCalendlyUrl(url);
    ls.set(CALENDLY_KEY, url);
    db.upsert("rs_page_settings", { startup_id: startup.id, page_id: page.id, calendly_url: url, created_by: me });
    setEditCalendly(false);
  };

  const addMemberToPage = (userId) => {
    if (pgMems.find(m => m.user_id === userId)) return;
    onAddPageMember(page.id, userId);
    setMemberSearch("");
  };

  const PRIORITY_C = { low: "#10b981", medium: "#f59e0b", high: "#ef4444" };
  const PAGE_MEMBER_ROLES = [
    { id: "admin", label: "Admin", icon: Crown, c: "#f59e0b" },
    { id: "moderator", label: "Moderator", icon: Shield, c: "#6366f1" },
    { id: "member", label: "Member", icon: User, c: "#10b981" }
  ];
  const activities = [...messages.map(m => ({ ...m, kind: "msg" })), ...tasks.map(t => ({ ...t, kind: "task" })), ...meetings.map(m => ({ ...m, kind: "mtg" }))].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 40);

  const inp = { background: dk ? "rgba(255,255,255,0.06)" : "#f8fafc", border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", color: th.txt, fontFamily: "inherit", width: "100%", boxSizing: "border-box" };

  const PAGE_TABS = [
    { id: "chat", icon: MessageSquare, label: "Chat" },
    { id: "tasks", icon: ListTodo, label: "Tasks" },
    { id: "files", icon: FolderOpen, label: "Files" },
    { id: "meetings", icon: Calendar, label: "Meetings" },
    { id: "activity", icon: Activity, label: "Activity" },
    { id: "members", icon: Users, label: "Members" },
  ];

  return (
    <div style={{ animation: "fadeUp 0.25s ease both" }}>
      {viewingProf && <UserProfilePanel profile={profiles[viewingProf]} userId={viewingProf} dk={dk} onClose={() => setViewingProf(null)} />}

      {/* Back */}
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", cursor: "pointer", color: th.txt2, fontSize: 13, fontWeight: 600, padding: "0 0 14px" }}>
        <ArrowLeft size={15} /> Back to {startup.name}
      </button>

      {/* Page card */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 16, padding: "16px 20px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: `${pt.c}20`, border: `1px solid ${pt.c}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <pt.icon size={20} color={pt.c} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: th.txt }}>{page.name}</div>
            <div style={{ fontSize: 12, color: th.txt3, marginTop: 2 }}>{page.description || pt.desc}</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: th.txt3, fontWeight: 600, flexShrink: 0, marginLeft: 12 }}>{pgMems.length} member{pgMems.length !== 1 ? "s" : ""}</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 14, background: th.surf2, borderRadius: 12, padding: 4, border: `1px solid ${th.bdr}`, overflowX: "auto" }}>
        {PAGE_TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setPageTab(t.id)} style={{ flexShrink: 0, padding: "7px 12px", borderRadius: 9, border: "none", background: pageTab === t.id ? "#6366f1" : "transparent", color: pageTab === t.id ? "#fff" : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── CHAT ── */}
      {pageTab === "chat" && (
        <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 340px)", minHeight: 300 }}>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, paddingBottom: 8 }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: "center", margin: "auto", color: th.txt3, fontSize: 13 }}>
                <div style={{ fontSize: 38, marginBottom: 8 }}>💬</div>
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : messages.map(msg => {
              const mine = msg.user_id === me;
              const prof = profiles[msg.user_id] || { name: "Member" };
              const rProf = msg.reply_to_user ? (profiles[msg.reply_to_user] || { name: "Member" }) : null;
              return (
                <div key={msg.id} style={{ display: "flex", flexDirection: mine ? "row-reverse" : "row", alignItems: "flex-end", gap: 8, paddingLeft: mine ? 40 : 0, paddingRight: mine ? 0 : 40 }}>
                  {!mine && <div onClick={() => setViewingProf(msg.user_id)} style={{ cursor: "pointer", flexShrink: 0 }}><Av profile={prof} size={28} /></div>}
                  <div style={{ maxWidth: "75%" }}>
                    {!mine && <div style={{ fontSize: 11, fontWeight: 700, color: pt.c, marginBottom: 3, paddingLeft: 4 }}>{prof.name}</div>}
                    {msg.reply_to_content && (
                      <div style={{ background: mine ? "rgba(255,255,255,0.15)" : th.surf2, borderLeft: `3px solid ${pt.c}`, borderRadius: "6px 6px 0 0", padding: "5px 10px", marginBottom: -4 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: pt.c }}>{rProf?.name || "Member"}</div>
                        <div style={{ fontSize: 11, color: th.txt3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{msg.reply_to_content}</div>
                      </div>
                    )}
                    <div style={{ background: mine ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : (dk ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.9)"), border: mine ? "none" : `1px solid ${th.bdr}`, borderRadius: mine ? "16px 4px 16px 16px" : "4px 16px 16px 16px", padding: "9px 13px" }} onDoubleClick={() => setReplyTo(msg)}>
                      <p style={{ margin: 0, fontSize: 13, color: mine ? "#fff" : th.txt, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</p>
                      <div style={{ fontSize: 10, color: mine ? "rgba(255,255,255,0.6)" : th.txt3, textAlign: "right", marginTop: 3 }}>{msg.created_at ? ago(new Date(msg.created_at).getTime()) : ""}</div>
                    </div>
                  </div>
                  {mine && <div style={{ width: 28 }} />}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          {replyTo && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: th.surf2, borderTop: `1px solid ${th.bdr}`, borderBottom: `1px solid ${th.bdr}` }}>
              <Reply size={14} color={th.txt3} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: pt.c, fontWeight: 700 }}>{profiles[replyTo.user_id]?.name || "Member"}</div>
                <div style={{ fontSize: 12, color: th.txt3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{replyTo.content}</div>
              </div>
              <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3 }}><X size={14} /></button>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, alignItems: "center", paddingTop: 12, borderTop: replyTo ? "none" : `1px solid ${th.bdr}`, flexShrink: 0 }}>
            <div onClick={() => setViewingProf(me)} style={{ cursor: "pointer", flexShrink: 0 }}><Av profile={profiles[me] || { name: "Me" }} size={32} /></div>
            <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }} placeholder="Message… (Enter to send, Shift+Enter for newline)" style={{ flex: 1, background: dk ? "rgba(255,255,255,0.06)" : "#f8fafc", border: `1px solid ${th.bdr}`, borderRadius: 22, padding: "10px 16px", fontSize: 13, outline: "none", color: th.txt, fontFamily: "inherit" }} data-testid="input-page-message" />
            <button onClick={sendMsg} disabled={!text.trim() || sending} style={{ width: 36, height: 36, borderRadius: "50%", background: text.trim() ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : th.surf2, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: text.trim() ? "pointer" : "default", flexShrink: 0 }} data-testid="button-send-message">
              <Send size={14} color={text.trim() ? "#fff" : th.txt3} />
            </button>
          </div>
        </div>
      )}

      {/* ── TASKS ── */}
      {pageTab === "tasks" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: th.txt2 }}>✅ Tasks ({tasks.length})</span>
            <button onClick={() => setShowTaskForm(v => !v)} style={{ display: "flex", alignItems: "center", gap: 5, background: "#6366f1", border: "none", borderRadius: 10, padding: "7px 14px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}><PlusCircle size={13} /> New Task</button>
          </div>
          {showTaskForm && (
            <div style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 14, padding: 16, marginBottom: 14, position: "relative", zIndex: 50 }}>
              <input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} onKeyDown={e => { if (e.key === "Enter" && taskForm.title.trim()) addTask(); }} placeholder="Task title *" style={{ ...inp, marginBottom: 10 }} autoFocus />
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <GlassDropdown
                  value={taskForm.assignee_id}
                  onChange={val => setTaskForm(f => ({ ...f, assignee_id: val }))}
                  options={assigneeOptions}
                  dk={dk}
                  style={{ flex: 1 }}
                />
                <GlassDropdown
                  value={taskForm.priority}
                  onChange={val => setTaskForm(f => ({ ...f, priority: val }))}
                  options={priorityOptions}
                  dk={dk}
                  style={{ flex: 1 }}
                />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowTaskForm(false)} style={{ flex: 1, padding: "9px", background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 10, cursor: "pointer", color: th.txt2, fontWeight: 600, fontSize: 13 }}>Cancel</button>
                <button onClick={addTask} disabled={!taskForm.title.trim()} style={{ flex: 2, padding: "9px", background: taskForm.title.trim() ? "#6366f1" : th.surf2, border: "none", borderRadius: 10, cursor: taskForm.title.trim() ? "pointer" : "default", color: taskForm.title.trim() ? "#fff" : th.txt3, fontWeight: 700, fontSize: 13 }}>Create Task</button>
              </div>
            </div>
          )}
          {tasks.length === 0 && !showTaskForm ? (
            <div style={{ textAlign: "center", padding: 40, color: th.txt3, fontSize: 13 }}>No tasks yet. Create the first one!</div>
          ) : tasks.map(task => {
            const assignee = task.assignee_id ? (profiles[task.assignee_id] || { name: "Member" }) : null;
            const pc = PRIORITY_C[task.priority] || PRIORITY_C.medium;
            const STATUS_ICONS = { todo: "", in_progress: "▶", done: "✓" };
            return (
              <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 12, background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 12, padding: "12px 16px", marginBottom: 8 }}>
                <button onClick={() => cycleTask(task.id)} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${task.status === "done" ? "#10b981" : task.status === "in_progress" ? "#f59e0b" : th.bdr}`, background: task.status === "done" ? "#10b981" : task.status === "in_progress" ? "#f59e0b18" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, fontSize: 11, fontWeight: 700, color: task.status === "done" ? "#fff" : "#f59e0b" }}>{STATUS_ICONS[task.status]}</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: task.status === "done" ? th.txt3 : th.txt, textDecoration: task.status === "done" ? "line-through" : "none" }}>{task.title}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 3, alignItems: "center", flexWrap: "wrap" }}>
                    {assignee && <span style={{ fontSize: 11, color: th.txt3 }}>→ {assignee.name}</span>}
                    <span style={{ background: `${pc}18`, color: pc, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, border: `1px solid ${pc}30`, textTransform: "capitalize" }}>{task.priority}</span>
                    <span style={{ fontSize: 10, color: th.txt3, background: th.surf2, padding: "2px 7px", borderRadius: 6, textTransform: "capitalize" }}>{task.status.replace("_", " ")}</span>
                  </div>
                </div>
                {(task.created_by === me || isFounder) && <button onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3, padding: 4 }}><Trash2 size={13} /></button>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── FILES ── */}
      {pageTab === "files" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: th.txt2 }}>📁 Files ({files.length})</span>
            <button onClick={() => fileInputRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 5, background: "#6366f1", border: "none", borderRadius: 10, padding: "7px 14px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>📎 Upload File</button>
            <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileUpload} />
          </div>
          {/* File preview modal */}
          {previewFile && (
            <div onClick={() => setPreviewFile(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "85vh", background: th.surf, borderRadius: 16, overflow: "hidden", boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${th.bdr}` }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: th.txt, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{previewFile.name}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    {previewFile.dataUrl && <a href={previewFile.dataUrl} download={previewFile.name} style={{ display: "flex", alignItems: "center", gap: 4, background: "#10b98118", border: "1px solid #10b98130", borderRadius: 8, padding: "5px 10px", color: "#10b981", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>⬇ Download</a>}
                    <button onClick={() => setPreviewFile(null)} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3, display: "flex", padding: 4 }}><X size={16} /></button>
                  </div>
                </div>
                {previewFile.type?.startsWith("image/") ? (
                  <img src={previewFile.dataUrl} alt={previewFile.name} style={{ maxWidth: "88vw", maxHeight: "78vh", display: "block", objectFit: "contain" }} />
                ) : (
                  <iframe src={previewFile.dataUrl} title={previewFile.name} style={{ width: "80vw", height: "75vh", border: "none", display: "block" }} />
                )}
              </div>
            </div>
          )}

          {files.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: th.txt3, fontSize: 13 }}>No files yet.</div>
          ) : files.map(f => {
            const uploader = profiles[f.uploaded_by] || { name: "Member" };
            const isImg = f.type?.startsWith("image/");
            const isPdf = f.type === "application/pdf";
            return (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 12, padding: "12px 16px", marginBottom: 8 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "#6366f118", border: "1px solid #6366f130", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  {isImg ? "🖼️" : isPdf ? "📕" : "📄"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: th.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: th.txt3, marginTop: 2 }}>{(f.size / 1024).toFixed(1)} KB · {uploader.name} · {ago(new Date(f.created_at).getTime())}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                  {f.dataUrl && <button onClick={() => setPreviewFile(f)} style={{ display: "flex", alignItems: "center", gap: 4, background: "#6366f118", border: "1px solid #6366f130", borderRadius: 8, padding: "5px 9px", cursor: "pointer", color: "#6366f1", fontSize: 11, fontWeight: 700 }}>👁 Preview</button>}
                  {f.dataUrl && <a href={f.dataUrl} download={f.name} style={{ display: "flex", alignItems: "center", gap: 4, background: "#10b98118", border: "1px solid #10b98130", borderRadius: 8, padding: "5px 9px", cursor: "pointer", color: "#10b981", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>⬇ Save</a>}
                  {(f.uploaded_by === me || isPageAdmin) && <button onClick={() => deleteFile(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3, padding: 4, display: "flex" }}><Trash2 size={13} /></button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MEETINGS ── */}
      {pageTab === "meetings" && <ComingSoonMeetings dk={dk} addNotif={addNotif} />}

      {/* ── ACTIVITY ── */}
      {pageTab === "activity" && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: th.txt2, marginBottom: 14 }}>⚡ Activity ({activities.length})</div>
          {activities.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: th.txt3, fontSize: 13 }}>No activity yet.</div>
          ) : activities.map(item => {
            const actor = profiles[item.user_id || item.created_by] || { name: "Member" };
            const kindLabel = item.kind === "msg" ? `sent: "${item.content?.slice(0, 40)}${item.content?.length > 40 ? "…" : ""}"` : item.kind === "task" ? `added task "${item.title}"` : `booked "${item.title}"`;
            const kindIcon = item.kind === "msg" ? "💬" : item.kind === "task" ? "✅" : "📅";
            return (
              <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: `1px solid ${th.bdr}` }}>
                <div onClick={() => setViewingProf(item.user_id || item.created_by)} style={{ cursor: "pointer", flexShrink: 0 }}><Av profile={actor} size={30} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: th.txt }}><span style={{ fontWeight: 700 }}>{actor.name}</span> {kindLabel}</div>
                  <div style={{ fontSize: 11, color: th.txt3, marginTop: 2 }}>{ago(new Date(item.created_at).getTime())}</div>
                </div>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{kindIcon}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MEMBERS ── */}
      {pageTab === "members" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: th.txt2 }}>👥 Members ({pgMems.length})</div>
          </div>

          {/* LinkedIn-like member search — only for page admins/founders */}
          {isPageAdmin && (() => {
            const availableToAdd = allMembers.filter(m => !pgMems.find(pm => pm.user_id === m.user_id));
            const searchTerm = memberSearch.toLowerCase().trim();
            const searchResults = searchTerm
              ? availableToAdd.filter(m => {
                const p = profiles[m.user_id];
                if (!p) return false;
                return (p.name || "").toLowerCase().includes(searchTerm) ||
                  (p.handle || "").toLowerCase().includes(searchTerm) ||
                  (p.email || "").toLowerCase().includes(searchTerm);
              })
              : availableToAdd.slice(0, 6);
            return (
              <div style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: th.txt3, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Add from Colab Members</div>
                <div style={{ position: "relative", marginBottom: searchResults.length > 0 ? 10 : 0 }}>
                  <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: th.txt3, pointerEvents: "none" }} />
                  <input
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    placeholder="Search by name, handle, or email…"
                    style={{ ...inp, paddingLeft: 34 }}
                    data-testid="input-member-search"
                  />
                </div>
                {availableToAdd.length === 0 ? (
                  <div style={{ fontSize: 12, color: th.txt3, textAlign: "center", padding: "8px 0" }}>All colab members are already in this page.</div>
                ) : searchResults.length === 0 && searchTerm ? (
                  <div style={{ fontSize: 12, color: th.txt3, textAlign: "center", padding: "8px 0" }}>No members match your search.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {searchResults.map(m => {
                      const p = profiles[m.user_id] || { name: "Member" };
                      return (
                        <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 10, background: th.surf2, borderRadius: 10, padding: "8px 12px" }}>
                          <Av profile={p} size={32} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: th.txt }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: th.txt3 }}>@{p.handle || m.user_id.slice(0, 8)}</div>
                          </div>
                          <button
                            onClick={() => addMemberToPage(m.user_id)}
                            style={{ flexShrink: 0, padding: "5px 12px", background: "#6366f1", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 12 }}
                            data-testid={`button-add-member-${m.user_id}`}
                          >+ Add</button>
                        </div>
                      );
                    })}
                    {!searchTerm && availableToAdd.length > 6 && (
                      <div style={{ fontSize: 11, color: th.txt3, textAlign: "center", padding: "4px 0" }}>Search to find more ({availableToAdd.length - 6} more available)</div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {pgMems.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: th.txt3, fontSize: 13 }}>No members with access yet.</div>
          ) : pgMems.map(pm => {
            const prof = profiles[pm.user_id] || { name: "Member" };
            const role = pageRoles[pm.user_id] || "member";
            const ri = PAGE_MEMBER_ROLES.find(r => r.id === role) || PAGE_MEMBER_ROLES[2];
            return (
              <div key={pm.user_id} style={{ display: "flex", alignItems: "center", gap: 12, background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 12, padding: "12px 16px", marginBottom: 8 }}>
                <div onClick={() => setViewingProf(pm.user_id)} style={{ cursor: "pointer", flexShrink: 0 }}><Av profile={prof} size={40} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: th.txt }}>{prof.name}</div>
                  <div style={{ fontSize: 12, color: th.txt3 }}>@{prof.handle || pm.user_id.slice(0, 8)}</div>
                </div>
                {isPageAdmin ? (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {PAGE_MEMBER_ROLES.map(r => {
                      const Icon = r.icon;
                      return (
                        <button key={r.id} onClick={() => setMemberRole(pm.user_id, r.id)} style={{ display: "flex", alignItems: "center", gap: 4, background: role === r.id ? `${r.c}22` : th.surf2, border: `1px solid ${role === r.id ? r.c + "50" : th.bdr}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer", color: role === r.id ? r.c : th.txt3, fontSize: 11, fontWeight: role === r.id ? 700 : 500 }}>
                          <Icon size={11} color={role === r.id ? r.c : th.txt3} /> {r.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: `${ri.c}18`, color: ri.c, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8, border: `1px solid ${ri.c}30` }}>
                    <ri.icon size={11} color={ri.c} /> {ri.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Coming Soon Meetings Section ──────────────────────────────────
function ComingSoonMeetings({ dk, addNotif }) {
  const th = T(dk);
  const [subscribed, setSubscribed] = useState(() => {
    try {
      return localStorage.getItem("rs_notify_meetings") === "true";
    } catch { return false; }
  });

  useEffect(() => {
    const styleId = "meetings-coming-soon-keyframes";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes float-mtg {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const handleNotify = () => {
    try {
      localStorage.setItem("rs_notify_meetings", "true");
    } catch { }
    setSubscribed(true);
    if (addNotif) {
      addNotif({ type: "success", msg: "🚀 Subscribed to Meetings integration updates!" });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center", animation: "fadeUp 0.3s ease both" }}>
      <div style={{
        background: dk ? "rgba(99, 102, 241, 0.04)" : "rgba(99, 102, 241, 0.02)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${dk ? "rgba(99, 102, 241, 0.2)" : "rgba(99, 102, 241, 0.1)"}`,
        borderRadius: 24,
        padding: "40px 32px",
        width: "100%",
        maxWidth: 460,
        boxShadow: "0 10px 40px -10px rgba(99, 102, 241, 0.08)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        boxSizing: "border-box"
      }}>
        {/* Animated Floating Icon Container */}
        <div style={{
          position: "relative",
          width: 76,
          height: 76,
          borderRadius: 22,
          background: "linear-gradient(135deg, #6366f1, #a855f7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
          boxShadow: "0 8px 20px rgba(99, 102, 241, 0.3)",
          animation: "float-mtg 4s ease-in-out infinite"
        }}>
          <Calendar size={32} color="#fff" />
          <div style={{
            position: "absolute",
            bottom: -6,
            right: -6,
            width: 32,
            height: 32,
            borderRadius: 10,
            background: "#ec4899",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 10px rgba(236, 72, 153, 0.4)",
            border: `2px solid ${th.surf}`
          }}>
            <Video size={14} color="#fff" />
          </div>
        </div>

        {/* Coming Soon Badge */}
        <span style={{
          background: dk ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.08)",
          color: "#f59e0b",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          fontSize: 10,
          fontWeight: 800,
          padding: "4px 12px",
          borderRadius: 99,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          marginBottom: 16,
          display: "inline-block"
        }}>
          Coming Soon
        </span>

        {/* Headline */}
        <h3 style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 800, color: th.txt }}>
          Meetings Integration
        </h3>

        {/* Description */}
        <p style={{ margin: "0 0 24px", fontSize: 13, color: th.txt2, lineHeight: 1.6, maxWidth: 420 }}>
          We are currently integrating calendar scheduling with Google Meet, Zoom, and Calendly to help your team coordinate and sync seamlessly.
        </p>

        {/* Features Checklist */}
        <div style={{
          width: "100%",
          background: th.surf2,
          border: `1px solid ${th.bdr}`,
          borderRadius: 16,
          padding: 16,
          textAlign: "left",
          marginBottom: 24,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 12
        }}>
          {[
            { title: "Calendly Embed", desc: "Integrate personal Calendly slots inside page views." },
            { title: "1-Click Meeting Links", desc: "Instantly spin up Google Meet or Zoom invites." },
            { title: "Team Calendars", desc: "Consolidated developer, designer & marketing schedules." }
          ].map((feat, idx) => (
            <div key={idx} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#10b981",
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
                marginTop: 1
              }}>✓</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: th.txt }}>{feat.title}</div>
                <div style={{ fontSize: 11, color: th.txt3, marginTop: 1 }}>{feat.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <button
          onClick={handleNotify}
          disabled={subscribed}
          style={{
            background: subscribed ? "rgba(16, 185, 129, 0.15)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            border: subscribed ? "1px solid rgba(16, 185, 129, 0.3)" : "none",
            borderRadius: 12,
            padding: "12px 24px",
            color: subscribed ? "#10b981" : "#fff",
            fontWeight: 700,
            fontSize: 13,
            cursor: subscribed ? "default" : "pointer",
            transition: "all 0.2s",
            boxShadow: subscribed ? "none" : "0 4px 12px rgba(99, 102, 241, 0.2)",
            display: "flex",
            alignItems: "center",
            gap: 6
          }}
        >
          {subscribed ? "✓ Subscribed for Updates" : "Notify Me on Release"}
        </button>
      </div>
    </div>
  );
}

// ─── Meetings Tab ───────────────────────────────────────────────────
function MeetingsTab({ pages, startup, me, profiles, members, dk }) {
  const th = T(dk);
  const [bookingFor, setBookingFor] = useState(null);
  const [meetingsByPage, setMeetingsByPage] = useState({});
  const [form, setForm] = useState({ title: "", date: "", time: "", platform: "google_meet", link: "", agenda: "", with_note: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const map = {};
    pages.forEach(pg => { map[pg.id] = ls.get(`rs_mtg_${pg.id}`, []); });
    setMeetingsByPage(map);
    (async () => {
      for (const pg of pages) {
        const remote = await db.get("rs_page_meetings", `page_id=eq.${pg.id}&order=meeting_date.asc`);
        if (remote?.length) { map[pg.id] = remote; }
      }
      setMeetingsByPage({ ...map });
    })();
  }, [pages]);

  const bookMeeting = async () => {
    if (!form.title.trim() || !form.date || !form.time || !bookingFor) return;
    setSaving(true);
    const payload = { page_id: bookingFor, startup_id: startup.id, created_by: me, title: (form.title ?? "").trim(), meeting_date: form.date, meeting_time: form.time, platform: form.platform, link: (form.link ?? "").trim(), agenda: (form.agenda ?? "").trim(), with_note: (form.with_note ?? "").trim() };
    const saved = await db.post("rs_page_meetings", payload);
    const mtg = saved || { id: `local_${Date.now()}`, ...payload, created_at: new Date().toISOString() };
    if (!saved) { const loc = ls.get(`rs_mtg_${bookingFor}`, []); ls.set(`rs_mtg_${bookingFor}`, [...loc, mtg]); }
    setMeetingsByPage(prev => ({ ...prev, [bookingFor]: [...(prev[bookingFor] || []), mtg] }));
    setForm({ title: "", date: "", time: "", platform: "google_meet", link: "", agenda: "", with_note: "" });
    setBookingFor(null);
    setSaving(false);
  };

  const inp = { background: dk ? "rgba(255,255,255,0.06)" : "#fff", border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", color: th.txt, fontFamily: "inherit", width: "100%", boxSizing: "border-box" };

  return (
    <div>
      <div style={{ fontWeight: 800, fontSize: 16, color: th.txt, marginBottom: 18 }}>All Meetings Across Pages</div>
      {pages.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: th.txt3 }}><Calendar size={36} color={th.txt3} style={{ margin: "0 auto 8px" }} /><p>No pages yet. Create pages first.</p></div>
      ) : pages.map(pg => {
        const pt = PAGE_TYPES.find(p => p.id === pg.type_id) || PAGE_TYPES[0];
        const mtgs = meetingsByPage[pg.id] || [];
        const isBooking = bookingFor === pg.id;
        return (
          <div key={pg.id} style={{ marginBottom: 20 }}>
            {/* Page header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: pt.c }} />
              <span style={{ fontWeight: 700, fontSize: 14, color: pt.c }}>{pg.name}</span>
            </div>
            {/* Meetings row */}
            <div style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: isBooking || mtgs.length ? `1px solid ${th.bdr}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Calendar size={14} color={th.txt3} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: th.txt2 }}>Meetings ({mtgs.length})</span>
                </div>
                <button
                  onClick={() => { setBookingFor(isBooking ? null : pg.id); setForm({ title: "", date: "", time: "", platform: "google_meet", link: "", agenda: "" }); }}
                  style={{ display: "flex", alignItems: "center", gap: 5, background: "#3b82f6", border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  {isBooking ? <X size={12} /> : <PlusCircle size={12} />} {isBooking ? "Cancel" : "Book"}
                </button>
              </div>

              {/* Booking form */}
              {isBooking && (
                <div style={{ padding: "16px", borderBottom: mtgs.length ? `1px solid ${th.bdr}` : "none", display: "flex", flexDirection: "column", gap: 10 }}>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Meeting title *" style={inp} />
                  <div style={{ display: "flex", gap: 10 }}>
                    <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ ...inp, flex: 1 }} />
                    <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} style={{ ...inp, flex: 1 }} />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[{ id: "google_meet", label: "Google Meet", icon: Video }, { id: "zoom", label: "Zoom", icon: Camera }].map(p => {
                      const Icon = p.icon;
                      return (
                        <button key={p.id} onClick={() => setForm(f => ({ ...f, platform: p.id }))}
                          style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${form.platform === p.id ? "#3b82f6" : th.bdr}`, background: form.platform === p.id ? "#3b82f6" : th.surf2, color: form.platform === p.id ? "#fff" : th.txt2, fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <Icon size={14} /> {p.label}
                        </button>
                      );
                    })}
                  </div>
                  <input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} placeholder="Meeting link (optional)" style={inp} />
                  <input value={form.with_note} onChange={e => setForm(f => ({ ...f, with_note: e.target.value }))} placeholder="With whom? (e.g. John, Sarah — optional)" style={inp} />
                  <textarea value={form.agenda} onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))} placeholder="Agenda (optional)" rows={2} style={{ ...inp, resize: "vertical" }} />
                  <button onClick={bookMeeting} disabled={!form.title.trim() || !form.date || !form.time || saving}
                    style={{ padding: "11px", background: form.title.trim() && form.date && form.time ? "#3b82f6" : th.surf2, border: "none", borderRadius: 10, color: form.title.trim() && form.date && form.time ? "#fff" : th.txt3, fontWeight: 700, fontSize: 13, cursor: form.title.trim() && form.date && form.time ? "pointer" : "default" }}>
                    {saving ? "Scheduling…" : "Schedule Meeting"}
                  </button>
                </div>
              )}

              {/* Meeting list */}
              {mtgs.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", color: th.txt3, fontSize: 12 }}>No meetings scheduled.</div>
              ) : mtgs.map((mtg, i) => {
                const booker = profiles?.[mtg.created_by] || { name: "Unknown" };
                return (
                  <div key={mtg.id} style={{ padding: "12px 16px", borderTop: i === 0 ? "none" : `1px solid ${th.bdr}`, display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "#3b82f618", border: "1px solid #3b82f630", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Calendar size={16} color="#3b82f6" /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: th.txt }}>{mtg.title}</div>
                      <div style={{ fontSize: 12, color: th.txt3, marginTop: 2 }}>{mtg.meeting_date} · {mtg.meeting_time} · {mtg.platform === "zoom" ? "📷 Zoom" : "📹 Google Meet"}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: th.txt3 }}>Booked by</span>
                        <Av profile={booker} size={18} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: th.txt2 }}>{booker.name}</span>
                        {mtg.with_note && <><span style={{ fontSize: 11, color: th.txt3 }}>· with</span><span style={{ fontSize: 11, fontWeight: 600, color: "#6366f1" }}>{mtg.with_note}</span></>}
                      </div>
                      {mtg.link && <a href={mtg.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#3b82f6", fontWeight: 600, display: "inline-block", marginTop: 4 }}>Join link →</a>}
                      {mtg.agenda && <p style={{ fontSize: 12, color: th.txt2, margin: "4px 0 0", fontStyle: "italic" }}>{mtg.agenda}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Create/Edit Startup Modal ──────────────────────────────────────
function CreateStartupModal({ me, existing, onClose, onSave, dk }) {
  const th = T(dk);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Parse phonePrefix and phoneNum from existing.phone
  const phoneStr = existing?.phone || "";
  let parsedPrefix = "+91";
  let parsedNum = phoneStr;
  if (phoneStr) {
    const match = COLAB_COUNTRIES.find(c => phoneStr.startsWith(c.code + " "));
    if (match) {
      parsedPrefix = match.code;
      parsedNum = phoneStr.slice(match.code.length + 1);
    } else {
      const matchNoSpace = COLAB_COUNTRIES.find(c => phoneStr.startsWith(c.code));
      if (matchNoSpace) {
        parsedPrefix = matchNoSpace.code;
        parsedNum = phoneStr.slice(matchNoSpace.code.length);
      }
    }
  }

  const [phonePrefix, setPhonePrefix] = useState(parsedPrefix);
  const [phoneNum, setPhoneNum] = useState(parsedNum);

  const [form, setForm] = useState({
    name: existing?.name || "",
    logo: existing?.logo || "🚀",
    description: existing?.description || "",
    website: existing?.website || "",
    github_link: existing?.github_link || "",
    twitter: existing?.social_links?.twitter || "",
    linkedin: existing?.social_links?.linkedin || "",
    location: existing?.location || ""
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [detectingLoc, setDetectingLoc] = useState(false);
  const step1Valid = form.name.trim() && form.description.trim();
  const step2Valid = step1Valid && form.location.trim() && phoneNum.trim();
  const EMOJIS = ["🚀", "💡", "⚡", "🎯", "💰", "🌍", "🔥", "🤝", "📊", "🎨", "🛠️", "🧠", "💎", "🌱", "🔬", "📱"];
  const inp = { width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box", color: th.txt, fontFamily: "inherit" };

  const fileInputRef = useRef(null);
  const [logoType, setLogoType] = useState(form.logo && (form.logo.startsWith("data:") || form.logo.startsWith("http")) ? "image" : "emoji");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await processAndUploadImage(file, { bucket: 'images', maxWidth: 400 });
      set("logo", url);
    } catch (err) {
      console.error("Image upload failed:", err);
    } finally {
      setUploadingLogo(false);
    }
  };

  const detectStartupLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        if (res.ok) {
          const data = await res.json();
          const city = data.address.city || data.address.town || data.address.village || data.address.suburb || "";
          const country = data.address.country || "";
          set("location", city && country ? `${city}, ${country}` : data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } else {
          set("location", `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
      } catch (err) {
        set("location", `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      } finally {
        setDetectingLoc(false);
      }
    }, (err) => {
      console.error(err);
      alert("Failed to retrieve location: " + err.message);
      setDetectingLoc(false);
    });
  };

  const save = async () => {
    if (!step2Valid) return; setSaving(true);
    const fullPhone = phonePrefix && phoneNum ? `${phonePrefix} ${phoneNum.trim()}` : phoneNum ? phoneNum.trim() : null;
    const payload = { name: form.name.trim(), logo: form.logo, description: form.description.trim(), website: form.website.trim(), github_link: form.github_link.trim(), social_links: { twitter: form.twitter.trim(), linkedin: form.linkedin.trim() }, created_by: me, founders: existing?.founders || [me], referral_code: existing?.referral_code || genRefCode(form.name), location: form.location.trim() || null, phone: fullPhone };
    let result;
    if (existing?.id) { await db.patch("rs_startups", `id=eq.${existing.id}`, payload); result = { ...existing, ...payload }; }
    else {
      result = await db.post("rs_startups", payload);
      if (result?.id) {
        const defaultPages = DEFAULT_ROLE_PAGES.map(rp => ({ startup_id: result.id, name: rp.name, description: rp.description, type_id: rp.type_id, created_by: me }));
        await db.postMany("rs_startup_pages", defaultPages);
      }
    }
    setSaving(false); onSave(result); onClose();
  };

  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: dk ? "rgba(13,20,38,0.97)" : "rgba(255,255,255,0.97)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: `1px solid ${th.bdr}`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 460, animation: "fadeUp 0.25s ease both", margin: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: th.txt }}>{existing ? `Edit Startup — Step ${step}/2` : `Create Startup — Step ${step}/2`}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3 }}><X size={18} /></button>
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>{[1, 2].map(s => <div key={s} style={{ flex: 1, height: 3, borderRadius: 99, background: s <= step ? "#3b82f6" : th.bdr, transition: "all 0.3s" }} />)}</div>
        {step === 1 && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 6 }}>Startup Logo</label>

              <div style={{ display: "flex", gap: 2, marginBottom: 10, background: th.surf2, borderRadius: 10, padding: 3, border: `1px solid ${th.bdr}` }}>
                <button
                  type="button"
                  onClick={() => {
                    setLogoType("emoji");
                    if (form.logo && (form.logo.startsWith("data:") || form.logo.startsWith("http"))) {
                      set("logo", "");
                    }
                  }}
                  style={{ flex: 1, padding: "6px 12px", borderRadius: 8, background: logoType === "emoji" ? (dk ? "rgba(255,255,255,0.08)" : "#fff") : "transparent", color: th.txt, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", border: logoType === "emoji" ? `1px solid ${th.bdr}` : "1px solid transparent", boxShadow: logoType === "emoji" ? "0 1px 3px rgba(0,0,0,0.05)" : "none" }}
                >
                  Initials Logo
                </button>
                <button
                  type="button"
                  onClick={() => setLogoType("image")}
                  style={{ flex: 1, padding: "6px 12px", borderRadius: 8, background: logoType === "image" ? (dk ? "rgba(255,255,255,0.08)" : "#fff") : "transparent", color: th.txt, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", border: logoType === "image" ? `1px solid ${th.bdr}` : "1px solid transparent", boxShadow: logoType === "image" ? "0 1px 3px rgba(0,0,0,0.05)" : "none" }}
                >
                  Upload Image
                </button>
              </div>

              {logoType === "emoji" ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, background: th.surf2, borderRadius: 10, padding: 20, border: `1px solid ${th.bdr}`, minHeight: 110, justifyContent: "center" }}>
                  <Logo name={form.name || "Startup"} src={null} size={64} radius={16} fontSize={30} />
                  <span style={{ fontSize: 12, color: th.txt3, fontWeight: 600 }}>Preview of your initials-based logo</span>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 14, background: th.surf2, borderRadius: 10, padding: 12, border: `1px solid ${th.bdr}` }}>
                  <Logo name={form.name} src={form.logo} size={56} radius={14} fontSize={28} />
                  <div style={{ flex: 1 }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                      style={{ display: "flex", alignItems: "center", gap: 6, background: dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)", border: `1px dashed ${th.bdr}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer", color: th.txt2, fontSize: 12, fontWeight: 600, width: "100%", justifyContent: "center", transition: "all 0.2s" }}
                    >
                      {uploadingLogo ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={14} />}
                      {uploadingLogo ? "Uploading..." : "Choose Image from PC"}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleImageUpload}
                    />
                  </div>
                </div>
              )}
            </div>
            {[{ k: "name", l: "Startup Name *", p: "e.g. SkillSwap" }, { k: "description", l: "Description *", p: "What are you building?", rows: 3 }].map(({ k, l, p, rows }) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 4 }}>{l}</label>
                {rows ? <textarea value={form[k]} onChange={e => set(k, e.target.value)} placeholder={p} rows={rows} style={{ ...inp, resize: "vertical" }} /> : <input value={form[k]} onChange={e => set(k, e.target.value)} placeholder={p} style={inp} />}
              </div>
            ))}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "10px", background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 12, cursor: "pointer", color: th.txt2, fontWeight: 600 }}>Cancel</button>
              <button onClick={() => setStep(2)} disabled={!step1Valid} style={{ flex: 2, padding: "10px", background: step1Valid ? "#3b82f6" : th.surf2, border: "none", borderRadius: 12, cursor: step1Valid ? "pointer" : "default", color: step1Valid ? "#fff" : th.txt3, fontWeight: 700 }}>Next →</button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            {[{ k: "website", l: "Website", p: "https://…" }, { k: "github_link", l: "GitHub", p: "https://github.com/…" }, { k: "twitter", l: "Twitter/X", p: "https://twitter.com/…" }, { k: "linkedin", l: "LinkedIn", p: "https://linkedin.com/company/…" }].map(({ k, l, p }) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 4 }}>{l}</label>
                <input value={form[k]} onChange={e => set(k, e.target.value)} placeholder={p} style={inp} />
              </div>
            ))}

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 4 }}>Location *</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={form.location || ""} onChange={e => set("location", e.target.value)} placeholder="e.g. Silicon Valley, CA" style={{ ...inp, flex: 1 }} />
                <button
                  type="button"
                  disabled={detectingLoc}
                  onClick={detectStartupLocation}
                  style={{
                    background: dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                    border: `1px solid ${th.bdr}`,
                    borderRadius: 10,
                    padding: "0 14px",
                    color: th.txt2,
                    cursor: detectingLoc ? "not-allowed" : "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  {detectingLoc ? "⏳" : "📍 Detect"}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 4 }}>Phone (Private) *</label>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ width: 110, flexShrink: 0 }}>
                  <ColabGlassSelect
                    value={phonePrefix}
                    onChange={setPhonePrefix}
                    options={COLAB_COUNTRIES.map(c => ({
                      value: c.code,
                      label: (
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <img
                            src={`https://flagcdn.com/w20/${c.iso}.png`}
                            style={{ width: 16, height: 12, objectFit: "cover", borderRadius: 2 }}
                            alt=""
                          />
                          {c.code}
                        </span>
                      )
                    }))}
                    dk={dk}
                    th={th}
                  />
                </div>
                <input type="tel" value={phoneNum || ""} onChange={e => setPhoneNum(e.target.value)} placeholder="e.g. 555-0100" style={inp} />
              </div>
              <div style={{ fontSize: 10, color: th.txt3, marginTop: 4 }}>This phone number is secure and not displayed publicly.</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: "10px", background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 12, cursor: "pointer", color: th.txt2, fontWeight: 600 }}>← Back</button>
              <button onClick={save} disabled={saving || !step2Valid} style={{ flex: 2, padding: "10px", background: (saving || !step2Valid) ? th.surf2 : "linear-gradient(135deg,#3b82f6,#8b5cf6)", border: "none", borderRadius: 12, cursor: (saving || !step2Valid) ? "default" : "pointer", color: (saving || !step2Valid) ? th.txt3 : "#fff", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {existing ? (saving ? "Saving…" : "Save Changes") : (saving ? "Launching…" : (
                  <>Launch Startup <Rocket size={15} /></>
                ))}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.getElementById("portal-root")
  );
}

// ─── Join via Code Modal ────────────────────────────────────────────
function JoinCodeModal({ me, onClose, onJoined, dk, isMobile = false }) {
  const th = T(dk);
  const [code, setCode] = useState("");
  const [startup, setStartup] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const check = async () => {
    if (!code.trim()) return;
    setChecking(true); setError(""); setStartup(null);
    const res = await db.get("rs_startups", `referral_code=eq.${code.trim().toUpperCase()}`);
    if (!res?.length) setError("Invalid code.");
    else setStartup(res[0]);
    setChecking(false);
  };

  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: dk ? "rgba(13,20,38,0.97)" : "rgba(255,255,255,0.97)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: `1px solid ${th.bdr}`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 380, animation: "fadeUp 0.25s ease both" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: th.txt }}>Join via Code</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3 }}><X size={18} /></button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); setStartup(null); }} onKeyDown={e => e.key === "Enter" && check()} placeholder="e.g. SKILL-A3B2" style={{ flex: 1, background: th.inp, border: `1px solid ${error ? "#ef4444" : startup ? "#10b981" : th.inpB}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, outline: "none", color: th.txt, fontFamily: "monospace" }} />
          <button onClick={check} disabled={checking || !code.trim()} style={{ background: "#3b82f6", border: "none", borderRadius: 10, padding: "0 16px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{checking ? "…" : "Check"}</button>
        </div>
        {error && <p style={{ fontSize: 13, color: "#ef4444", margin: "0 0 12px" }}>✕ {error}</p>}
        {startup && (
          <div style={{ background: th.surf2, borderRadius: 14, padding: 14, marginBottom: 16, border: "1px solid #10b98130" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Logo name={startup.name} src={startup.logo} size={42} radius={11} fontSize={22} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: th.txt }}>{startup.name}</div>
                <div style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>✓ Valid startup</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: th.txt2, margin: 0 }}>{startup.description?.slice(0, 100)}…</p>
          </div>
        )}
        {startup && <button onClick={() => { onJoined(startup); onClose(); }} style={{ width: "100%", padding: "11px", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Continue →</button>}
      </div>
    </div>,
    document.getElementById("portal-root")
  );
}

// ─── Liquid Glass Select Dropdown Component ─────────────────────────────
function LiquidGlassSelect({ value, onChange, options, dk, th }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: 12,
          border: open ? "1px solid #6366f1" : `1px solid ${th.inpB}`,
          background: dk
            ? "linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.75))"
            : "linear-gradient(135deg, rgba(255, 255, 255, 0.85), rgba(241, 245, 249, 0.95))",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          color: th.txt,
          fontSize: 13,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          boxShadow: open
            ? "0 0 18px rgba(99, 102, 241, 0.35)"
            : "0 2px 8px rgba(0,0,0,0.08)",
          transition: "all 0.2s ease",
          textAlign: "left",
          boxSizing: "border-box"
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#6366f1", boxShadow: "0 0 8px #6366f1" }} />
          {value || options[0]}
        </span>
        <ChevronDown size={14} color={th.txt2} style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 9999,
            background: dk
              ? "rgba(10, 16, 30, 0.92)"
              : "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: `1px solid ${dk ? "rgba(99, 102, 241, 0.35)" : "rgba(99, 102, 241, 0.25)"}`,
            borderRadius: 14,
            padding: 6,
            boxShadow: dk
              ? "0 16px 40px rgba(0, 0, 0, 0.7), 0 0 24px rgba(99, 102, 241, 0.25)"
              : "0 16px 40px rgba(99, 102, 241, 0.18), 0 4px 14px rgba(0, 0, 0, 0.08)",
            animation: "fadeUp 0.18s cubic-bezier(0.16, 1, 0.3, 1) both",
          }}
        >
          {options.map((opt) => {
            const selected = value === opt;
            return (
              <div
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                style={{
                  padding: "9px 12px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: selected ? 700 : 500,
                  color: selected ? "#6366f1" : th.txt,
                  background: selected
                    ? "rgba(99, 102, 241, 0.16)"
                    : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!selected) e.currentTarget.style.background = dk ? "rgba(255, 255, 255, 0.08)" : "rgba(99, 102, 241, 0.08)";
                }}
                onMouseLeave={(e) => {
                  if (!selected) e.currentTarget.style.background = "transparent";
                }}
              >
                <span>{opt}</span>
                {selected && <Check size={14} color="#6366f1" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Products & Services Section Component ─────────────────────────────
function ProductsServicesSection({ startup, isFounder, me, dk, addNotif, myProfile, openSubscriptionModal, profiles }) {
  const th = T(dk);
  const PROD_KEY = `rs_prods_${startup.id}`;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingProd, setEditingProd] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", price: "499", currency: "₹", category: "SaaS", demo_url: "", image_url: "" });
  const [submitting, setSubmitting] = useState(false);

  const founderProfile = isFounder ? myProfile : (profiles ? profiles[startup.created_by] : null);
  const activePlan = isPlanActive(founderProfile);
  const subPlan = founderProfile?.subscription_plan || "free";

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let prods = [];

        // 1. Try fetching from standalone DB table rs_startup_products
        try {
          const remote = await db.get("rs_startup_products", `startup_id=eq.${startup.id}&order=created_at.desc`);
          if (Array.isArray(remote) && remote.length > 0) {
            prods = remote;
          }
        } catch (e) {
          // Table rs_startup_products may not exist in DB
        }

        // 2. Check startup object's products array (persisted in rs_startups table)
        if (!prods.length && startup.products && Array.isArray(startup.products) && startup.products.length > 0) {
          prods = startup.products;
        }

        // 3. Check local storage cache
        if (!prods.length) {
          const localProds = ls.get(PROD_KEY, []);
          if (localProds.length > 0) {
            prods = localProds;
          }
        }

        setProducts(prods);
        ls.set(PROD_KEY, prods);

        // 4. Auto-sync: If founder has local products, persist them to rs_startups and rs_startup_products in Supabase so ALL users can see them
        if (isFounder && prods.length > 0) {
          try {
            await db.patch("rs_startups", `id=eq.${startup.id}`, { products: prods });
            startup.products = prods;

            // Upload any local products (with temporary prod_ or local_ IDs) to rs_startup_products DB table
            let updatedList = [...prods];
            let modified = false;
            for (let i = 0; i < updatedList.length; i++) {
              const p = updatedList[i];
              if (!p.id || String(p.id).startsWith("prod_") || String(p.id).startsWith("local_")) {
                try {
                  const payload = {
                    startup_id: startup.id,
                    created_by: me,
                    title: p.title || "Untitled Product",
                    description: p.description || "",
                    price: p.price || "Free",
                    category: p.category || "SaaS",
                    demo_url: p.demo_url || "",
                    image_url: p.image_url || "",
                    updated_at: new Date().toISOString(),
                  };
                  const saved = await db.post("rs_startup_products", payload);
                  if (saved && saved.id) {
                    updatedList[i] = { ...p, ...saved };
                    modified = true;
                  }
                } catch (err) {}
              }
            }
            if (modified) {
              setProducts(updatedList);
              ls.set(PROD_KEY, updatedList);
              await db.patch("rs_startups", `id=eq.${startup.id}`, { products: updatedList });
              startup.products = updatedList;
            }
          } catch (err) {
            console.warn("Auto-sync local products warning:", err);
          }
        }
      } catch (e) {
        console.error("Products fetch error:", e);
        const fallback = ls.get(PROD_KEY, startup.products || []);
        setProducts(fallback);
      } finally {
        setLoading(false);
      }
    })();
  }, [startup.id, isFounder, me]);

  const parsePriceAndCurrency = (str = "") => {
    if (!str || str === "Free") return { currency: "Free", price: "" };
    if (str.startsWith("₹")) return { currency: "₹", price: str.slice(1).trim() };
    if (str.startsWith("$")) return { currency: "$", price: str.slice(1).trim() };
    if (str.startsWith("€")) return { currency: "€", price: str.slice(1).trim() };
    if (str.startsWith("£")) return { currency: "£", price: str.slice(1).trim() };
    return { currency: "Custom", price: str };
  };

  const handleOpenAdd = () => {
    if (!activePlan) {
      addNotif?.({ type: "warning", msg: "🔒 An active subscription plan is required to publish products." });
      openSubscriptionModal?.();
      return;
    }
    const maxAllowed = subPlan === "growth" ? 10 : subPlan === "starter" ? 3 : 0;
    if (products.length >= maxAllowed) {
      if (subPlan === "free") {
        addNotif?.({ type: "warning", msg: "🔒 A paid subscription (Starter or Growth) is required to add products to your startup." });
      } else if (subPlan === "starter") {
        addNotif?.({ type: "warning", msg: "⚠️ Founder Starter plan allows up to 3 products. Upgrade to Founder Growth (₹1,299/mo) for up to 10 products!" });
      } else {
        addNotif?.({ type: "warning", msg: "⚠️ Maximum limit of 10 products reached." });
      }
      openSubscriptionModal?.();
      return;
    }
    setForm({ title: "", description: "", price: "499", currency: "₹", category: "SaaS", demo_url: "", image_url: "" });
    setEditingProd(null);
    setShowAdd(true);
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await processAndUploadImage(file);
      setForm(f => ({ ...f, image_url: url }));
    } catch (err) {
      addNotif?.({ type: "error", msg: err.message || "Failed to process image." });
    }
  };

  const handleSaveProduct = async () => {
    const isFormValid = Boolean(form.title.trim() && (form.currency === "Free" || form.price.trim()) && form.category.trim() && form.description.trim() && form.image_url.trim());
    if (!isFormValid) return;

    const formattedPrice = form.currency === "Free" ? "Free" : form.currency === "Custom" ? form.price.trim() : `${form.currency}${form.price.trim()}`;

    setSubmitting(true);
    try {
      const payload = {
        startup_id: startup.id,
        created_by: me,
        title: form.title.trim(),
        description: form.description.trim(),
        price: formattedPrice,
        category: form.category || "SaaS",
        demo_url: form.demo_url.trim(),
        image_url: form.image_url.trim(),
        updated_at: new Date().toISOString(),
      };

      let saved;
      try {
        if (editingProd?.id && !editingProd.id.startsWith("local_") && !editingProd.id.startsWith("prod_")) {
          await db.patch("rs_startup_products", `id=eq.${editingProd.id}`, payload);
          saved = { ...editingProd, ...payload };
        } else {
          saved = await db.post("rs_startup_products", payload);
        }
      } catch (e) {}

      const prodObj = saved || { id: editingProd?.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, ...payload, created_at: new Date().toISOString() };

      const nextProds = editingProd ? products.map(p => p.id === prodObj.id ? prodObj : p) : [prodObj, ...products];
      setProducts(nextProds);
      ls.set(PROD_KEY, nextProds);

      // Persist directly to rs_startups table in Supabase so every user account can view products
      startup.products = nextProds;
      try {
        await db.patch("rs_startups", `id=eq.${startup.id}`, { products: nextProds });
      } catch (e) {
        console.warn("Failed to patch rs_startups products:", e);
      }

      addNotif?.({ type: "success", msg: editingProd ? "Product updated!" : "Product added successfully! 🚀" });
      setShowAdd(false);
      setEditingProd(null);
    } catch (e) {
      console.error(e);
      addNotif?.({ type: "error", msg: "Failed to save product." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (prodId) => {
    try {
      try {
        if (!prodId.startsWith("local_") && !prodId.startsWith("prod_")) {
          await db.del("rs_startup_products", `id=eq.${prodId}`);
        }
      } catch (e) {}

      const nextProds = products.filter(p => p.id !== prodId);
      setProducts(nextProds);
      ls.set(PROD_KEY, nextProds);

      startup.products = nextProds;
      try {
        await db.patch("rs_startups", `id=eq.${startup.id}`, { products: nextProds });
      } catch (e) {}

      addNotif?.({ type: "info", msg: "Product removed." });
    } catch (e) {
      console.error(e);
    }
  };

  if (!isFounder && !activePlan) {
    return (
      <div style={{
        padding: "36px 20px",
        textAlign: "center",
        background: dk ? "rgba(255, 255, 255, 0.03)" : "#f8fafc",
        borderRadius: 16,
        border: `1px solid ${th.bdr}`,
        margin: "16px 0"
      }}>
        <Lock size={32} color="#6366f1" style={{ marginBottom: 10 }} />
        <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: th.txt }}>Products Currently Hidden</h4>
        <p style={{ margin: 0, fontSize: 13, color: th.txt3 }}>
          The listed products for this startup are hidden because the founder's subscription plan is inactive.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {isFounder && !activePlan && (
        <UpgradeToUnlockCard
          sectionName="Product Listings"
          openSubscriptionModal={openSubscriptionModal}
          dk={dk}
          compact={true}
          badgeText="Plan Inactive / Expired"
          description="Your products are hidden from other users. Upgrade your subscription plan to unlock product listings."
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: th.txt, display: "flex", alignItems: "center", gap: 8 }}>
            <Rocket size={18} color="#6366f1" /> Showcase ({products.length})
          </h3>
          <p style={{ margin: 0, fontSize: 12, color: th.txt3 }}>
            {isFounder ? (
              activePlan
                ? (subPlan === "growth" ? "Founder Growth Plan: Up to 10 showcase items allowed" : "Founder Starter Plan: Up to 3 showcase items allowed")
                : "Subscribe to unlock and show products to users"
            ) : "Offerings and products by this startup"}
          </p>
        </div>


        {isFounder && (
          <button
            onClick={handleOpenAdd}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 4px 12px rgba(99,102,241,0.25)",
            }}
          >
            <PlusCircle size={14} /> Add Product / Service
          </button>
        )}
      </div>

      {showAdd && (() => {
        const isFormValid = Boolean(form.title.trim() && (form.currency === "Free" || form.price.trim()) && form.category.trim() && form.description.trim() && form.image_url.trim());
        return (
          <Card dk={dk} style={{ marginBottom: 20, padding: 18, overflow: "visible" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: th.txt, marginBottom: 14 }}>
              {editingProd ? "Edit Product / Service" : "Add New Product / Service"}
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 4, display: "block" }}>Product Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. AI Content Suite, SaaS Pro, Consulting Package"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 4, display: "block" }}>Price &amp; Currency *</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ width: 90, flexShrink: 0 }}>
                      <LiquidGlassSelect
                        value={form.currency}
                        onChange={val => setForm(f => ({ ...f, currency: val, price: val === "Free" ? "" : f.price }))}
                        options={["₹", "$", "€", "£", "Free", "Custom"]}
                        dk={dk}
                        th={th}
                      />
                    </div>
                    <input
                      value={form.price}
                      onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      placeholder={form.currency === "Free" ? "Free" : "e.g. 499 / mo"}
                      disabled={form.currency === "Free"}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: `1px solid ${th.inpB}`,
                        background: form.currency === "Free" ? th.surf2 : th.inp,
                        color: th.txt,
                        outline: "none",
                        fontSize: 13,
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 4, display: "block" }}>Category *</label>
                  <LiquidGlassSelect
                    value={form.category}
                    onChange={val => setForm(f => ({ ...f, category: val }))}
                    options={["SaaS", "Product", "Service", "Mobile App", "API", "Consulting", "Other"]}
                    dk={dk}
                    th={th}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 4, display: "block" }}>Description *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What does this product do? What features are included?"
                  rows={3}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" }}
                />
              </div>

              {/* Product Image section: Device Upload or Link */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 4, display: "block" }}>Product Image * (Device Upload or Image Link)</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <label style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.surf2, color: th.txt, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <Upload size={14} color="#6366f1" /> Upload Image (Max 2MB)
                      <input type="file" accept="image/*" onChange={handleImageFileChange} style={{ display: "none" }} />
                    </label>
                    <span style={{ fontSize: 11, color: th.txt3 }}>or paste URL below</span>
                  </div>
                  <input
                    value={form.image_url}
                    onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                    placeholder="https://example.com/product-image.jpg or data:image/..."
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                  />
                  {form.image_url && (
                    <div style={{ position: "relative", width: 120, height: 80, borderRadius: 8, overflow: "hidden", border: `1px solid ${th.bdr}`, marginTop: 4 }}>
                      <img src={form.image_url} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = 'none'; }} />
                      <button onClick={() => setForm(f => ({ ...f, image_url: "" }))} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>✕</button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 4, display: "block" }}>Website / Demo URL (Optional)</label>
                <input
                  value={form.demo_url}
                  onChange={e => setForm(f => ({ ...f, demo_url: e.target.value }))}
                  placeholder="https://myproduct.com"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button onClick={() => setShowAdd(false)} style={{ padding: "9px 16px", borderRadius: 10, border: `1px solid ${th.bdr}`, background: "transparent", color: th.txt2, cursor: "pointer", fontSize: 13 }}>Cancel</button>
              <button
                onClick={handleSaveProduct}
                disabled={submitting || !isFormValid}
                style={{
                  padding: "9px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: isFormValid ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : (dk ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
                  color: isFormValid ? "#fff" : th.txt3,
                  cursor: isFormValid && !submitting ? "pointer" : "not-allowed",
                  fontWeight: 700,
                  fontSize: 13,
                  opacity: isFormValid ? 1 : 0.55,
                  transition: "all 0.2s ease"
                }}
              >
                {submitting ? "Saving…" : "Save Product"}
              </button>
            </div>
          </Card>
        );
      })()}

      {loading ? (
        <Spin dk={dk} msg="Loading products…" />
      ) : products.length === 0 ? (
        <Card dk={dk} style={{ textAlign: "center", padding: 36, color: th.txt3 }}>
          <Rocket size={32} style={{ opacity: 0.4, margin: "0 auto 8px" }} />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: th.txt }}>No products or services listed yet.</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: th.txt3 }}>
            {isFounder ? "Click 'Add Product / Service' to showcase your offerings to users and investors." : "Check back later for updates."}
          </p>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {products.map(prod => (
            <Card key={prod.id} dk={dk} style={{ padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 12, overflow: "hidden" }}>
              <div>
                {prod.image_url && (
                  <div style={{ width: "100%", height: 140, borderRadius: 10, overflow: "hidden", marginBottom: 12, background: th.surf2, border: `1px solid ${th.bdr}` }}>
                    <img src={prod.image_url} alt={prod.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = 'none'; }} />
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 10, background: "rgba(99,102,241,0.12)", color: "#6366f1", padding: "2px 8px", borderRadius: 99, fontWeight: 700, display: "inline-block", marginBottom: 4 }}>
                      {prod.category || "Product"}
                    </span>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: th.txt }}>{prod.title}</h4>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, background: "#10b98118", color: "#10b981", padding: "3px 9px", borderRadius: 8, flexShrink: 0 }}>
                    {prod.price || "Free"}
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: 12, color: th.txt2, lineHeight: 1.5 }}>
                  {prod.description || "No description provided."}
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${th.bdr}`, paddingTop: 10, marginTop: 4 }}>
                {prod.demo_url ? (
                  <a href={prod.demo_url.startsWith("http") ? prod.demo_url : `https://${prod.demo_url}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, color: "#6366f1", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                    <Globe size={13} /> Visit Product ↗
                  </a>
                ) : <span style={{ fontSize: 11, color: th.txt3 }}>Available on request</span>}

                {isFounder && (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => {
                        const parsed = parsePriceAndCurrency(prod.price);
                        setForm({ title: prod.title, description: prod.description || "", price: parsed.price, currency: parsed.currency, category: prod.category || "SaaS", demo_url: prod.demo_url || "", image_url: prod.image_url || "" });
                        setEditingProd(prod);
                        setShowAdd(true);
                      }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3, padding: 4 }}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(prod.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Visitor / Member Detail View ──────────────────────────────────
function VisitorDetail({ startup, me, profiles: initialProfiles, dk, onBack, addNotif, isMobile = false, initialTab = "overview", myProfile, openSubscriptionModal }) {

  const th = T(dk);
  const [profiles, setProfiles] = useState(initialProfiles);

  useEffect(() => {
    setProfiles(prev => ({ ...prev, ...initialProfiles }));
  }, [initialProfiles]);

  const [tab, setTab] = useState(initialTab);
  const [pages, setPages] = useState([]);
  const [members, setMembers] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [myRequest, setMyRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinRoles, setJoinRoles] = useState([]);
  const [joinMsg, setJoinMsg] = useState("");
  const [submittingJoin, setSubmittingJoin] = useState(false);
  const [activePage, setActivePage] = useState(null);
  const [leaveConfirm, setLeaveConfirm] = useState(false);

  // Per-page requests/access (localStorage + Supabase)
  const PG_REQ_KEY = `rs_pg_req_${startup.id}`;
  const PG_MEM_KEY = `rs_pg_mem_${startup.id}`;
  const [pageReqs, setPageReqs] = useState(() => ls.get(PG_REQ_KEY, []));
  const [pageMembers, setPageMembers] = useState(() => ls.get(PG_MEM_KEY, []));
  const [dbPageAccess, setDbPageAccess] = useState([]);
  const [dbPageRequests, setDbPageRequests] = useState([]);
  const [requestingPageId, setRequestingPageId] = useState(null);

  const isStartupMember = myRequest?.status === "approved";

  const leaveColab = async () => {
    if (!leaveConfirm) { setLeaveConfirm(true); return; }
    await Promise.all([
      db.del("rs_page_access", `startup_id=eq.${startup.id}&user_id=eq.${me}`),
      db.del("rs_page_access_requests", `startup_id=eq.${startup.id}&user_id=eq.${me}`),
    ]);
    addNotif?.({ type: "info", msg: "You have left the colab." });
    onBack();
  };

  const PG_CACHE_KEY = `rs_pg_cache_${startup.id}`;

  useEffect(() => {
    (async () => {
      const [reqs, pgs, mbs, upds, myAccess, myPageReqs, pgMembers] = await Promise.all([
        db.get("rs_page_access_requests", `startup_id=eq.${startup.id}&user_id=eq.${me}`),
        db.get("rs_startup_pages", `startup_id=eq.${startup.id}&order=created_at.asc`),
        db.get("rs_page_access", `startup_id=eq.${startup.id}&status=eq.approved`),
        db.get("rs_startup_updates", `startup_id=eq.${startup.id}&order=created_at.desc&limit=20`),
        db.get("rs_page_access", `startup_id=eq.${startup.id}&user_id=eq.${me}`),
        db.get("rs_page_access_requests", `startup_id=eq.${startup.id}&user_id=eq.${me}`),
        db.get("rs_page_members", `startup_id=eq.${startup.id}`),
      ]);
      setMyRequest(reqs?.[0] || null);
      // Fall back to localStorage cache if Supabase returned nothing
      // (covers the case where pages were saved locally by the Founder on the same device)
      const resolvedPages = (pgs?.length) ? pgs : ls.get(PG_CACHE_KEY, []);
      setPages(resolvedPages);
      setMembers([...new Map((mbs || []).map(m => [m.user_id, m])).values()]);
      setPageMembers(pgMembers || []);
      setUpdates(upds || []);
      setDbPageAccess(myAccess || []);
      setDbPageRequests(myPageReqs || []);

      // Fetch missing profiles here!
      const neededUids = new Set();
      (reqs || []).forEach(r => r.user_id && neededUids.add(r.user_id));
      (mbs || []).forEach(m => m.user_id && neededUids.add(m.user_id));
      (upds || []).forEach(u => u.created_by && neededUids.add(u.created_by));
      (myAccess || []).forEach(a => a.user_id && neededUids.add(a.user_id));
      (myPageReqs || []).forEach(r => r.user_id && neededUids.add(r.user_id));
      (pgMembers || []).forEach(m => m.user_id && neededUids.add(m.user_id));
      resolvedPages.forEach(p => p.created_by && neededUids.add(p.created_by));
      if (startup.created_by) neededUids.add(startup.created_by);
      (startup.founders || []).forEach(uid => uid && neededUids.add(uid));

      const missingUids = [...neededUids].filter(uid => !initialProfiles[uid]);
      if (missingUids.length > 0) {
        const fetched = await db.get("rs_user_profiles", `id=in.(${missingUids.join(",")})`);
        if (fetched && fetched.length > 0) {
          const newProfiles = {};
          fetched.forEach(r => {
            newProfiles[r.id] = { ...r, hue: strColor(r.name || "?") };
          });
          setProfiles(prev => ({ ...prev, ...newProfiles }));
        }
      }

      setLoading(false);
    })();
  }, [startup.id, me, initialProfiles]);

  const submitJoin = async () => {
    if (!joinRoles.length) return;
    setSubmittingJoin(true);
    const saved = await Promise.all(
      joinRoles.map(role => db.post("rs_page_access_requests", {
        startup_id: startup.id, user_id: me, selected_roles: [role], message: joinMsg.trim(), status: "pending"
      }))
    );
    const firstSaved = saved.find(Boolean);
    if (firstSaved) {
      setMyRequest(firstSaved);
      addNotif?.({ type: "success", msg: `${joinRoles.length} role request${joinRoles.length > 1 ? "s" : ""} sent!` });
    }
    setSubmittingJoin(false); setShowJoinForm(false);
  };

  const requestPageAccess = async (pageId) => {
    const existingLocal = pageReqs.find(r => r.page_id === pageId && r.user_id === me);
    const existingDb = dbPageRequests.find(r => r.page_id === pageId);
    if (existingLocal || existingDb) return;
    setRequestingPageId(pageId);
    const pg = pages.find(p => p.id === pageId);
    const payload = {
      startup_id: startup.id,
      user_id: me,
      page_id: pageId,
      page_name: pg?.name || "",
      page_type_id: pg?.type_id || "",
      status: "pending",
    };
    const saved = await db.post("rs_page_access_requests", payload);
    const req = saved || { id: `pgreq_${Date.now()}`, ...payload, created_at: new Date().toISOString() };
    const updatedLocal = [...pageReqs, req];
    setPageReqs(updatedLocal);
    ls.set(PG_REQ_KEY, updatedLocal);
    if (saved) setDbPageRequests(prev => [...prev, saved]);
    setRequestingPageId(null);
    addNotif?.({ type: "success", msg: "Page access requested!" });
  };

  const getPageAccess = (pageId) => {
    const pg = pages.find(p => p.id === pageId);
    // Per-page membership: match by exact page_id OR by page name (covers local_pg_ → real UUID transitions)
    const mem = pageMembers.find(m => m.user_id === me && (
      m.page_id === pageId || (pg && pageMembers.find(n => n.user_id === me && pages.find(p2 => p2.id === n.page_id && p2.name === pg.name)))
    ));
    if (mem) return "approved";
    // Per-page approved request in DB
    const dbReq = dbPageRequests.find(r => r.page_id === pageId && r.status === "approved");
    if (dbReq) return "approved";
    // Per-page pending/rejected in DB
    const dbReqAny = dbPageRequests.find(r => r.page_id === pageId);
    if (dbReqAny) return dbReqAny.status || "pending";
    // Per-page request in localStorage — match by page_id or by page_name
    const req = pageReqs.find(r => r.user_id === me && (
      r.page_id === pageId || (pg?.name && r.page_name === pg.name)
    ));
    if (req) return req.status;
    return null; // not requested yet → show "Request Access"
  };

  const founders = (startup.founders || [startup.created_by]).filter(Boolean);
  const teamUids = [...new Set([...founders, ...members.map(m => m.user_id)])];
  const headerBg = dk ? "linear-gradient(135deg,rgba(30,58,138,0.25),rgba(91,33,182,0.2))" : "linear-gradient(135deg,#e0e7ff,#ede9fe)";
  const TABS = [{ id: "overview", label: "Overview" }, { id: "products", label: "Showcase" }, { id: "pages", label: "Pages" }, { id: "updates", label: "Updates" }, { id: "feedback", label: "Feedback" }];

  if (activePage) return <PageChatView page={activePage} startup={startup} me={me} profiles={profiles} pageMembers={pageMembers} allMembers={members} isFounder={false} dk={dk} onBack={() => setActivePage(null)} onAddPageMember={(pageId, userId) => { const mems = [...pageMembers, { page_id: pageId, user_id: userId }]; setPageMembers(mems); ls.set(PG_MEM_KEY, mems); }} addNotif={addNotif} />;

  return (
    <div style={{ animation: "fadeUp 0.3s ease both" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", cursor: "pointer", color: th.txt2, fontSize: 13, fontWeight: 600, padding: "0 0 14px" }}>
        <ArrowLeft size={15} /> Back to Colab
      </button>

      {/* Startup header card */}
      <div style={{ background: headerBg, border: dk ? "1px solid rgba(99,102,241,0.2)" : "1px solid #c7d2fe", borderRadius: 20, padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Logo name={startup.name} src={startup.logo} size={64} radius={16} fontSize={32} />
            <div>
              <div style={{ fontWeight: 900, fontSize: 22, color: th.txt }}>{startup.name}</div>
              <div style={{ fontSize: 13, color: th.txt2, marginTop: 3 }}>{startup.description?.slice(0, 80)}{startup.description?.length > 80 ? "…" : ""}</div>
            </div>
          </div>
          {!myRequest ? (
            tab !== "pages" && (
              <button onClick={() => setTab("pages")} style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 12, padding: "10px 22px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", flexShrink: 0 }}>Join Startup</button>
            )
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
              <div onClick={() => setTab("pages")} style={{ cursor: "pointer", padding: "8px 16px", borderRadius: 12, fontWeight: 700, fontSize: 13, background: myRequest.status === "approved" ? "#10b98118" : myRequest.status === "rejected" ? "#ef444418" : "#f59e0b18", color: myRequest.status === "approved" ? "#10b981" : myRequest.status === "rejected" ? "#ef4444" : "#f59e0b", border: `1px solid ${myRequest.status === "approved" ? "#10b98140" : myRequest.status === "rejected" ? "#ef444440" : "#f59e0b40"}` }}>
                {myRequest.status === "approved" ? "✅ Member" : myRequest.status === "rejected" ? "❌ Not approved" : "⏳ Pending"}
              </div>
              {myRequest.status === "approved" && (
                leaveConfirm ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>Leave colab?</span>
                    <button onClick={leaveColab} style={{ background: "#ef4444", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: "#fff", fontSize: 11, fontWeight: 700 }}>Yes, leave</button>
                    <button onClick={() => setLeaveConfirm(false)} style={{ background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer", color: th.txt2, fontSize: 11 }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={leaveColab} style={{ display: "flex", alignItems: "center", gap: 4, background: "#ef444412", border: "1px solid #ef444430", borderRadius: 9, padding: "5px 12px", cursor: "pointer", color: "#ef4444", fontSize: 11, fontWeight: 700 }}><LogOut size={11} /> Leave Colab</button>
                )
              )}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: teamUids.length ? 14 : 0 }}>
          {startup.location && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: dk ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.7)", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "5px 12px", fontSize: 12, color: th.txt2, fontWeight: 600 }}>
              <span>📍</span> {startup.location}
            </div>
          )}
          {startup.website && <a href={startup.website} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, background: dk ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.7)", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "5px 12px", fontSize: 12, color: th.txt2, fontWeight: 600, textDecoration: "none" }}><Globe size={12} /> Website</a>}
          {startup.github_link && <a href={startup.github_link} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, background: dk ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.7)", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "5px 12px", fontSize: 12, color: th.txt2, fontWeight: 600, textDecoration: "none" }}><Github size={12} /> GitHub</a>}
          {startup.social_links?.twitter && <a href={startup.social_links.twitter} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#1da1f215", border: "1px solid #1da1f230", borderRadius: 8, padding: "5px 10px", textDecoration: "none" }}><Twitter size={13} color="#1da1f2" /></a>}
          {startup.social_links?.linkedin && <a href={startup.social_links.linkedin} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#0a66c215", border: "1px solid #0a66c230", borderRadius: 8, padding: "5px 10px", textDecoration: "none" }}><Linkedin size={13} color="#0a66c2" /></a>}
        </div>
        {teamUids.length > 0 && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {teamUids.slice(0, 6).map(uid => {
              const prof = profiles[uid] || { name: "Member" };
              return (
                <div key={uid} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Av profile={prof} size={30} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: th.txt }}>{prof.name?.split(" ")[0] || "Member"}</div>
                    <div style={{ fontSize: 10, color: th.txt3 }}>{founders.includes(uid) ? "Founder" : "Member"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>




      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: th.surf2, borderRadius: 12, padding: 4, border: `1px solid ${th.bdr}`, overflowX: "auto" }}>
        {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 9, border: "none", background: tab === t.id ? "#6366f1" : "transparent", color: tab === t.id ? "#fff" : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{t.label}</button>)}
      </div>

      {loading ? <Spin dk={dk} msg="Loading…" /> : (
        <>
          {tab === "overview" && (
            <div>
              <Card dk={dk} anim={false}>
                <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: th.txt }}>About</h4>
                <p style={{ margin: 0, fontSize: 13, color: th.txt2, lineHeight: 1.6 }}>{startup.description}</p>
              </Card>
            </div>
          )}

          {tab === "pages" && (
            <div>
              <div style={{ fontSize: 13, color: th.txt3, marginBottom: 14 }}>
                {isStartupMember ? "Your accessible pages based on your approved role(s)." : "Discover pages and request access to join them."}
              </div>
              {pages.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: th.txt3 }}>
                  <FileText size={36} color={th.txt3} style={{ margin: "0 auto 12px", opacity: 0.7 }} />
                  <p style={{ margin: 0, fontSize: 14 }}>No pages have been created in this colab yet.</p>
                </div>
              ) : pages.map(pg => {
                const pt = PAGE_TYPES.find(p => p.id === pg.type_id) || PAGE_TYPES[0];
                const access = getPageAccess(pg.id);
                const isLocked = access !== "approved";
                const isPending = access === "pending";
                const isRequesting = requestingPageId === pg.id;
                return (
                  <div key={pg.id} style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", background: th.surf, border: `1px solid ${isLocked ? th.bdr : `${pt.c}40`}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10, gap: 12, opacity: isLocked ? 0.72 : 1, transition: "opacity 0.2s" }}>
                    {/* Lock overlay badge */}
                    {isLocked && (
                      <div style={{ position: "absolute", top: 10, right: 10, width: 22, height: 22, borderRadius: "50%", background: dk ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Lock size={11} color={th.txt3} />
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: isLocked ? (dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)") : `${pt.c}18`, border: `1px solid ${isLocked ? th.bdr : `${pt.c}30`}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, filter: isLocked ? "grayscale(0.6)" : "none" }}>
                        <pt.icon size={18} color={isLocked ? th.txt3 : pt.c} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: isLocked ? th.txt2 : th.txt }}>{pg.name}</div>
                        <div style={{ fontSize: 12, color: th.txt3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pg.description || pt.desc}</div>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, paddingRight: isLocked ? 20 : 0 }}>
                      {access === "approved" ? (
                        <button onClick={() => setActivePage(pg)} style={{ display: "flex", alignItems: "center", gap: 5, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 8, padding: "7px 14px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          <LogIn size={12} /> Enter
                        </button>
                      ) : isPending ? (
                        <button disabled style={{ display: "flex", alignItems: "center", gap: 5, background: "#f59e0b12", border: "1px solid #f59e0b40", borderRadius: 8, padding: "7px 12px", color: "#f59e0b", fontSize: 12, fontWeight: 700, cursor: "default" }}>
                          ⏳ Pending…
                        </button>
                      ) : (
                        <button onClick={() => requestPageAccess(pg.id)} disabled={isRequesting} style={{ display: "flex", alignItems: "center", gap: 5, background: isRequesting ? th.surf2 : `${pt.c}15`, border: `1px solid ${isRequesting ? th.bdr : `${pt.c}40`}`, borderRadius: 8, padding: "7px 12px", color: isRequesting ? th.txt3 : pt.c, fontSize: 12, fontWeight: 600, cursor: isRequesting ? "default" : "pointer", transition: "all 0.2s" }}>
                          <Lock size={11} /> {isRequesting ? "Requesting…" : "Request Access"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "updates" && (
            <div>
              {updates.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: th.txt3 }}><Megaphone size={36} color={th.txt3} style={{ margin: "0 auto 8px" }} /><p>No updates yet.</p></div>
              ) : updates.map(u => {
                const prof = profiles[u.created_by] || { name: "Founder" };
                return (
                  <div key={u.id} style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <Av profile={prof} size={36} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: th.txt }}>{prof.name}</span>
                          <span style={{ fontSize: 12, color: th.txt3 }}>{ago(new Date(u.created_at).getTime())}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: th.txt2, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{u.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "products" && <ProductsServicesSection startup={startup} isFounder={false} me={me} dk={dk} addNotif={addNotif} myProfile={myProfile} openSubscriptionModal={openSubscriptionModal} />}
          {tab === "feedback" && <FeedbackSection startupId={startup.id} me={me} profiles={profiles} dk={dk} />}
        </>
      )}
    </div>
  );
}

// ─── Founder Dashboard ─────────────────────────────────────────────
function FounderDetail({ startup: initialStartup, me, profiles: initialProfiles, bals, dk, onBack, addNotif, onStartupUpdated, isMobile = false, initialTab = "overview", myProfile, openSubscriptionModal }) {
  const th = T(dk);
  const [startup, setStartup] = useState(initialStartup);
  const [profiles, setProfiles] = useState(initialProfiles);

  useEffect(() => {
    setProfiles(prev => ({ ...prev, ...initialProfiles }));
  }, [initialProfiles]);

  const [tab, setTab] = useState(initialTab);
  const [requests, setRequests] = useState([]);
  const [pages, setPages] = useState([]);
  const [members, setMembers] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [updateText, setUpdateText] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAddPage, setShowAddPage] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPageType, setNewPageType] = useState("community");
  const [activePage, setActivePage] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [memberViewMode, setMemberViewMode] = useState("all"); // "all" | "bypage"
  const [memberRoles, setMemberRoles] = useState({});
  const [expandedMember, setExpandedMember] = useState(null);

  // Per-page requests/access (localStorage)
  const PG_REQ_KEY = `rs_pg_req_${startup.id}`;
  const PG_MEM_KEY = `rs_pg_mem_${startup.id}`;
  const [pageReqs, setPageReqs] = useState(() => ls.get(PG_REQ_KEY, []));
  const [pageMembers, setPageMembers] = useState([]);

  const pendingPageReqs = pageReqs.filter(r => r.status === "pending");

  const assignMemberRole = (userId, roleId) => {
    const existing = memberRoles[userId] || [];
    const updated = existing.includes(roleId) ? existing.filter(r => r !== roleId) : [...existing, roleId];
    const newRoles = { ...memberRoles, [userId]: updated };
    setMemberRoles(newRoles); ls.set(`rs_m_roles_${startup.id}`, newRoles);
    if (existing.includes(roleId)) {
      db.del("rs_startup_member_roles", `startup_id=eq.${startup.id}&user_id=eq.${userId}&role_id=eq.${roleId}`);
    } else {
      db.post("rs_startup_member_roles", { startup_id: startup.id, user_id: userId, role_id: roleId });
    }
  };

  const assignMemberPage = (userId, pageId) => {
    const alreadyHas = pageMembers.find(m => m.page_id === pageId && m.user_id === userId);
    let mems;
    if (alreadyHas) {
      mems = pageMembers.filter(m => !(m.page_id === pageId && m.user_id === userId));
      db.del("rs_page_members", `page_id=eq.${pageId}&user_id=eq.${userId}`);
    } else {
      mems = [...pageMembers, { page_id: pageId, user_id: userId }];
      db.upsert("rs_page_members", { startup_id: startup.id, page_id: pageId, user_id: userId, created_by: me, created_at: new Date().toISOString() });
    }
    setPageMembers(mems); ls.set(PG_MEM_KEY, mems);
  };

  const PG_CACHE_KEY = `rs_pg_cache_${startup.id}`;

  const load = useCallback(async () => {
    const [reqs, pgs, mbs, upds, pgMembers, startupRoles] = await Promise.all([
      db.get("rs_page_access_requests", `startup_id=eq.${startup.id}&order=created_at.desc`),
      db.get("rs_startup_pages", `startup_id=eq.${startup.id}&order=created_at.asc`),
      db.get("rs_page_access", `startup_id=eq.${startup.id}&status=eq.approved`),
      db.get("rs_startup_updates", `startup_id=eq.${startup.id}&order=created_at.desc&limit=20`),
      db.get("rs_page_members", `startup_id=eq.${startup.id}`),
      db.get("rs_startup_member_roles", `startup_id=eq.${startup.id}`),
    ]);
    // Split into startup join requests (no page_id) and page-specific access requests (have page_id)
    const allReqs = reqs || [];
    const joinReqs = allReqs.filter(r => !r.page_id);
    const dbPageAccessReqs = allReqs.filter(r => !!r.page_id && r.status === "pending");
    setRequests(joinReqs);
    // Merge DB page requests with localStorage ones (avoid duplicates by id)
    const localPgReqs = ls.get(PG_REQ_KEY, []);
    const localIds = new Set(localPgReqs.map(r => r.id));
    const merged = [...localPgReqs, ...dbPageAccessReqs.filter(r => !localIds.has(r.id))];
    setPageReqs(merged);
    ls.set(PG_REQ_KEY, merged);
    // Auto-create any missing default role pages
    let finalPages = pgs || [];
    const missingPages = DEFAULT_ROLE_PAGES.filter(rp => !finalPages.find(p => p.name === rp.name));
    if (missingPages.length > 0) {
      const created = await Promise.all(
        missingPages.map(async rp => {
          const saved = await db.post("rs_startup_pages", { startup_id: startup.id, name: rp.name, description: rp.description, type_id: rp.type_id, created_by: me });
          if (!saved) console.error("Supabase Error: failed to auto-create page:", rp.name);
          return saved || { id: `local_pg_${rp.name.replace(/\s+/g, "_")}_${Date.now()}`, startup_id: startup.id, name: rp.name, description: rp.description, type_id: rp.type_id, created_by: me, created_at: new Date().toISOString() };
        })
      );
      finalPages = [...finalPages, ...created];
    }
    // Repair: try to re-save any pages that only exist locally (from a previous failed Supabase write)
    const localOnlyPages = finalPages.filter(p => String(p.id).startsWith("local_pg_"));
    if (localOnlyPages.length > 0) {
      const repaired = await Promise.all(localOnlyPages.map(async lp => {
        const saved = await db.post("rs_startup_pages", { startup_id: lp.startup_id, name: lp.name, description: lp.description, type_id: lp.type_id, created_by: lp.created_by });
        return saved || lp;
      }));
      finalPages = [
        ...finalPages.filter(p => !String(p.id).startsWith("local_pg_")),
        ...repaired,
      ];
    }
    // Cache pages to localStorage so members on the same device can see them immediately
    ls.set(PG_CACHE_KEY, finalPages);
    setPages(finalPages);
    const uniqueMembers = [...new Map((mbs || []).map(m => [m.user_id, m])).values()];
    if (!uniqueMembers.find(m => m.user_id === startup.created_by)) {
      uniqueMembers.unshift({ user_id: startup.created_by, status: "approved" });
    }
    setMembers(uniqueMembers);
    setPageMembers(pgMembers || []);
    const rolesMap = {};
    (startupRoles || []).forEach(r => {
      if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
      rolesMap[r.user_id].push(r.role_id);
    });
    setMemberRoles(rolesMap);
    setUpdates(upds || []);

    // Fetch missing profiles here!
    const neededUids = new Set();
    allReqs.forEach(r => r.user_id && neededUids.add(r.user_id));
    merged.forEach(r => r.user_id && neededUids.add(r.user_id));
    (mbs || []).forEach(m => m.user_id && neededUids.add(m.user_id));
    (upds || []).forEach(u => u.created_by && neededUids.add(u.created_by));
    (pgMembers || []).forEach(m => m.user_id && neededUids.add(m.user_id));
    finalPages.forEach(p => p.created_by && neededUids.add(p.created_by));
    if (startup.created_by) neededUids.add(startup.created_by);
    (startup.founders || []).forEach(uid => uid && neededUids.add(uid));

    const missingUids = [...neededUids].filter(uid => !initialProfiles[uid]);
    if (missingUids.length > 0) {
      const fetched = await db.get("rs_user_profiles", `id=in.(${missingUids.join(",")})`);
      if (fetched && fetched.length > 0) {
        const newProfiles = {};
        fetched.forEach(r => {
          newProfiles[r.id] = { ...r, hue: strColor(r.name || "?") };
        });
        setProfiles(prev => ({ ...prev, ...newProfiles }));
      }
    }

    setLoading(false);
  }, [startup.id, me, initialProfiles]);

  useEffect(() => { load(); }, [load]);

  const approveRequest = async (req) => {
    await db.patch("rs_page_access_requests", `id=eq.${req.id}`, { status: "approved" });
    await db.upsert("rs_page_access", { startup_id: startup.id, user_id: req.user_id, status: "approved" });
    setRequests(rs => rs.map(r => r.id === req.id ? { ...r, status: "approved" } : r));
    setMembers(ms => ms.find(m => m.user_id === req.user_id) ? ms : [...ms, { user_id: req.user_id, status: "approved" }]);

    // Auto-grant page access based on requested roles
    const grantedPages = new Set();
    const roles = req.selected_roles || [];

    for (const role of roles) {
      const typeId = ROLE_PAGE_MAP[role];
      if (typeId === null) {
        // Co-founder: access to all pages
        pages.forEach(p => grantedPages.add(p.id));
      } else if (typeId) {
        // Find pages matching the role's type_id
        pages.filter(p => p.type_id === typeId).forEach(p => grantedPages.add(p.id));
      }
    }

    if (grantedPages.size > 0) {
      const newMems = [];
      const dbEntries = [];
      for (const pid of grantedPages) {
        const alreadyHas = pageMembers.find(m => m.page_id === pid && m.user_id === req.user_id);
        if (!alreadyHas) {
          newMems.push({ page_id: pid, user_id: req.user_id });
          dbEntries.push({ startup_id: startup.id, page_id: pid, user_id: req.user_id, created_by: me, created_at: new Date().toISOString() });
        }
      }
      if (dbEntries.length > 0) {
        // Save to DB
        await Promise.all(dbEntries.map(e => db.upsert("rs_page_members", e)));
        // Update state
        const updatedPageMems = [...pageMembers, ...newMems];
        setPageMembers(updatedPageMems);
        ls.set(PG_MEM_KEY, updatedPageMems);
        addNotif?.({ type: "success", msg: `Approved and auto-granted access to ${dbEntries.length} page(s).` });
        return;
      }
    }

    addNotif?.({ type: "success", msg: "Request approved." });
  };

  const rejectRequest = async (req) => {
    await db.patch("rs_page_access_requests", `id=eq.${req.id}`, { status: "rejected" });
    setRequests(rs => rs.map(r => r.id === req.id ? { ...r, status: "rejected" } : r));
  };

  const deleteRequest = async (req) => {
    await db.del("rs_page_access_requests", `id=eq.${req.id}`);
    setRequests(rs => rs.filter(r => r.id !== req.id));
  };

  const approvePageReq = async (req) => {
    // Check user still exists
    if (!profiles[req.user_id]) {
      const cleaned = pageReqs.filter(r => r.id !== req.id);
      setPageReqs(cleaned); ls.set(PG_REQ_KEY, cleaned);
      addNotif?.({ type: "error", msg: "User no longer exists — request removed." });
      return;
    }
    // Resolve page_id: if it's a local_pg_ fallback ID, resolve to the real page by name
    let resolvedPageId = req.page_id;
    if (String(req.page_id).startsWith("local_pg_") && req.page_name) {
      const realPage = pages.find(p => p.name === req.page_name && !String(p.id).startsWith("local_pg_"));
      if (realPage) resolvedPageId = realPage.id;
    }
    // Persist approval to Supabase so member sees it on any device
    if (!String(req.id).startsWith("pgreq_")) {
      await db.patch("rs_page_access_requests", `id=eq.${req.id}`, { status: "approved", page_id: resolvedPageId });
    } else {
      // Local-only request — upsert into DB so the member can pick it up
      await db.post("rs_page_access_requests", {
        startup_id: startup.id,
        user_id: req.user_id,
        page_id: resolvedPageId,
        page_name: req.page_name || "",
        page_type_id: req.page_type_id || "",
        status: "approved",
      });
    }
    const alreadyMember = pageMembers.find(m => m.page_id === resolvedPageId && m.user_id === req.user_id);
    const updReqs = pageReqs.filter(r => r.id !== req.id);
    setPageReqs(updReqs); ls.set(PG_REQ_KEY, updReqs);
    if (!alreadyMember) {
      const mems = [...pageMembers, { page_id: resolvedPageId, user_id: req.user_id }];
      setPageMembers(mems); ls.set(PG_MEM_KEY, mems);
    }
    addNotif?.({ type: "success", msg: `Page access granted for "${req.page_name || resolvedPageId}"!` });
  };

  const rejectPageReq = async (req) => {
    // Persist rejection to Supabase
    if (!String(req.id).startsWith("pgreq_")) {
      await db.patch("rs_page_access_requests", `id=eq.${req.id}`, { status: "rejected" });
    }
    const updReqs = pageReqs.filter(r => r.id !== req.id);
    setPageReqs(updReqs); ls.set(PG_REQ_KEY, updReqs);
    addNotif?.({ type: "info", msg: "Request rejected." });
  };

  const removeMember = async (userId) => {
    await db.del("rs_page_access", `startup_id=eq.${startup.id}&user_id=eq.${userId}`);
    await db.del("rs_page_members", `startup_id=eq.${startup.id}&user_id=eq.${userId}`);
    await db.del("rs_startup_member_roles", `startup_id=eq.${startup.id}&user_id=eq.${userId}`);
    setMembers(ms => ms.filter(m => m.user_id !== userId));
    // Remove their page memberships and pending requests
    const cleanedMems = pageMembers.filter(m => m.user_id !== userId);
    setPageMembers(cleanedMems); ls.set(PG_MEM_KEY, cleanedMems);
    const cleanedReqs = pageReqs.filter(r => r.user_id !== userId);
    setPageReqs(cleanedReqs); ls.set(PG_REQ_KEY, cleanedReqs);
    addNotif?.({ type: "success", msg: "Member removed." });
  };

  const deleteColab = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await Promise.all([
      db.del("rs_startups", `id=eq.${startup.id}`),
      db.del("rs_startup_pages", `startup_id=eq.${startup.id}`),
      db.del("rs_startup_updates", `startup_id=eq.${startup.id}`),
      db.del("rs_page_access", `startup_id=eq.${startup.id}`),
      db.del("rs_page_access_requests", `startup_id=eq.${startup.id}`),
      db.del("rs_page_members", `startup_id=eq.${startup.id}`),
      db.del("rs_page_member_roles", `startup_id=eq.${startup.id}`),
      db.del("rs_startup_member_roles", `startup_id=eq.${startup.id}`),
      db.del("rs_page_tasks", `startup_id=eq.${startup.id}`),
      db.del("rs_page_files", `startup_id=eq.${startup.id}`),
      db.del("rs_page_settings", `startup_id=eq.${startup.id}`),
      db.del("rs_saved_startups", `startup_id=eq.${startup.id}`),
    ]);
    addNotif?.({ type: "success", msg: "Colab deleted." });
    onBack();
  };

  const postUpdate = async () => {
    if (!updateText.trim()) return;
    setPosting(true);
    const saved = await db.post("rs_startup_updates", { startup_id: startup.id, content: updateText.trim(), created_by: me });
    if (saved) setUpdates(us => [saved, ...us]);
    setUpdateText(""); setPosting(false);
    addNotif?.({ type: "success", msg: "Update posted!" });
  };

  const deleteUpdate = (id) => {
    db.del("rs_startup_updates", `id=eq.${id}`);
    setUpdates(us => us.filter(u => u.id !== id));
  };

  const isGrowthPlan = myProfile?.subscription_plan === "growth";

  const handleToggleAddPage = () => {
    if (!isGrowthPlan) {
      addNotif?.({ type: "warning", msg: "🔒 Custom page creation requires Founder Growth plan. Upgrade to Founder Growth to add custom pages!" });
      openSubscriptionModal?.();
      return;
    }
    setShowAddPage(v => !v);
  };

  const addPage = async () => {
    if (!isGrowthPlan) {
      addNotif?.({ type: "warning", msg: "🔒 Custom page creation requires Founder Growth plan. Upgrade to Founder Growth to add custom pages!" });
      openSubscriptionModal?.();
      return;
    }
    if (!newPageName.trim()) return;
    const pt = PAGE_TYPES.find(p => p.id === newPageType) || PAGE_TYPES[0];
    const saved = await db.post("rs_startup_pages", { startup_id: startup.id, name: newPageName.trim(), description: pt.desc, type_id: newPageType, created_by: me });
    const pg = saved || { id: `local_pg_${Date.now()}`, startup_id: startup.id, name: newPageName.trim(), description: pt.desc, type_id: newPageType, created_by: me, created_at: new Date().toISOString() };
    setPages(ps => { const updated = [...ps, pg]; ls.set(PG_CACHE_KEY, updated); return updated; });
    setNewPageName(""); setShowAddPage(false);
  };

  const deletePage = async (id) => {
    await db.del("rs_startup_pages", `id=eq.${id}`);
    await Promise.all([
      db.del("rs_page_members", `page_id=eq.${id}`),
      db.del("rs_page_member_roles", `page_id=eq.${id}`),
      db.del("rs_page_tasks", `page_id=eq.${id}`),
      db.del("rs_page_files", `page_id=eq.${id}`),
      db.del("rs_page_settings", `page_id=eq.${id}`),
    ]);
    setPages(ps => { const updated = ps.filter(p => p.id !== id); ls.set(PG_CACHE_KEY, updated); return updated; });
    const cleanedMems = pageMembers.filter(m => m.page_id !== id);
    setPageMembers(cleanedMems); ls.set(PG_MEM_KEY, cleanedMems);
    const cleanedReqs = pageReqs.filter(r => r.page_id !== id);
    setPageReqs(cleanedReqs); ls.set(PG_REQ_KEY, cleanedReqs);
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const totalPending = pendingCount + pendingPageReqs.length;

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "requests", label: `Requests${totalPending ? ` (${totalPending})` : ""}` },
    { id: "products", label: "Showcase" },
    { id: "pages", label: "Pages" },
    { id: "members", label: "Members" },
    { id: "meetings", label: "Meetings" },
    { id: "updates", label: "Updates" },
    { id: "feedback", label: "Feedback" },
  ];

  const inp = { background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box", color: th.txt, fontFamily: "inherit" };

  if (activePage) return <PageChatView page={activePage} startup={startup} me={me} profiles={profiles} pageMembers={pageMembers} allMembers={members} isFounder={true} dk={dk} onBack={() => setActivePage(null)} onAddPageMember={(pageId, userId) => { const exists = pageMembers.find(m => m.page_id === pageId && m.user_id === userId); if (exists) return; const entry = { startup_id: startup.id, page_id: pageId, user_id: userId, created_by: me, created_at: new Date().toISOString() }; db.upsert("rs_page_members", entry); const mems = [...pageMembers, entry]; setPageMembers(mems); ls.set(PG_MEM_KEY, mems); }} addNotif={addNotif} />;

  return (
    <div style={{ animation: "fadeUp 0.3s ease both" }}>
      {viewingProfile && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9998, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "16px", overflowY: "auto" }} onClick={() => setViewingProfile(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 680, background: dk ? "rgba(8,15,30,0.98)" : "#f8fafc", backdropFilter: "blur(24px)", border: `1px solid ${T(dk).bdr}`, borderRadius: 22, padding: "20px", marginTop: 16, marginBottom: 16, animation: "fadeUp 0.22s ease both" }}>
            <ProfileView uid={viewingProfile} me={me} dk={dk} bals={bals} profiles={profiles} setBals={() => { }} onBack={() => setViewingProfile(null)} onMessage={() => { }} addNotif={addNotif} />
          </div>
        </div>
      )}
      {showEdit && <CreateStartupModal me={me} existing={startup} onClose={() => setShowEdit(false)} onSave={s => { setStartup(s); onStartupUpdated?.(s); }} dk={dk} />}

      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", cursor: "pointer", color: th.txt2, fontSize: 13, fontWeight: 600, padding: "0 0 14px" }}>
        <ArrowLeft size={15} /> Back to Colab
      </button>

      {/* Header */}
      <div style={{ background: dk ? "linear-gradient(135deg,#1e3a8a22,#5b21b622)" : "linear-gradient(135deg,#dbeafe,#ede9fe)", border: `1px solid ${dk ? "#3b82f630" : "#bfdbfe"}`, borderRadius: 18, padding: 18, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Logo name={startup.name} src={startup.logo} size={60} radius={16} fontSize={30} />
            <div>
              <div style={{ fontWeight: 900, fontSize: 20, color: th.txt }}>{startup.name}</div>
              <div style={{ fontSize: 12, color: th.txt3, marginTop: 2 }}>Founder Dashboard · {pages.length} Pages · {members.length} Members</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ background: "#f59e0b18", border: "1px solid #f59e0b40", borderRadius: 10, padding: "6px 14px" }}>
              <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700 }}>REFERRAL CODE</div>
              <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 800, color: "#f59e0b", letterSpacing: 1 }}>{startup.referral_code}</div>
            </div>
            <CopyBtn text={startup.referral_code} label="Copy Code" />
            <CopyBtn text={`${window.location.origin}?join=${startup.referral_code}`} label="Copy Link" />
            <button onClick={() => setShowEdit(true)} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "6px 12px", cursor: "pointer", color: th.txt2, fontSize: 12, fontWeight: 600 }}><Edit2 size={12} /> Edit</button>
            {confirmDelete ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>Delete colab?</span>
                <button onClick={deleteColab} style={{ background: "#ef4444", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: "#fff", fontSize: 12, fontWeight: 700 }}>Yes, delete</button>
                <button onClick={() => setConfirmDelete(false)} style={{ background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: th.txt2, fontSize: 12, fontWeight: 600 }}>Cancel</button>
              </div>
            ) : (
              <button onClick={deleteColab} style={{ display: "flex", alignItems: "center", gap: 5, background: "#ef444412", border: "1px solid #ef444430", borderRadius: 10, padding: "6px 12px", cursor: "pointer", color: "#ef4444", fontSize: 12, fontWeight: 600 }}><Trash2 size={12} /> Delete</button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: th.surf2, borderRadius: 12, padding: 4, border: `1px solid ${th.bdr}`, overflowX: "auto" }}>
        {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 9, border: "none", background: tab === t.id ? "#3b82f6" : "transparent", color: tab === t.id ? "#fff" : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{t.label}</button>)}
      </div>

      {loading ? <Spin dk={dk} msg="Loading…" /> : (
        <>
          {tab === "overview" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
                {[{ l: "Members", v: members.length, c: "#3b82f6", icon: Users }, { l: "Pages", v: pages.length, c: "#8b5cf6", icon: FolderOpen }, { l: "Pending", v: totalPending, c: "#f59e0b", icon: ListTodo }].map(s => (
                  <div key={s.l} style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 14, padding: "14px 16px" }}>
                    <div style={{ marginBottom: 8, display: "flex" }}>
                      <s.icon size={22} color={s.c} />
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: 11, color: th.txt3 }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <Card dk={dk} anim={false}>
                <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: th.txt }}>About</h4>
                <p style={{ margin: "0 0 12px", fontSize: 14, color: th.txt2, lineHeight: 1.6 }}>{startup.description}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {startup.location && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "4px 10px", fontSize: 12, color: th.txt2, fontWeight: 600 }}>
                      <span>📍</span> {startup.location}
                    </div>
                  )}
                  {startup.website && <a href={startup.website} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "4px 10px", fontSize: 12, color: th.txt2, fontWeight: 600, textDecoration: "none" }}><Globe size={12} /> Website</a>}
                  {startup.github_link && <a href={startup.github_link} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "4px 10px", fontSize: 12, color: th.txt2, fontWeight: 600, textDecoration: "none" }}><Github size={12} /> GitHub</a>}
                  {startup.social_links?.twitter && <a href={startup.social_links.twitter} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, background: "#1da1f215", border: "1px solid #1da1f230", borderRadius: 8, padding: "4px 10px", fontSize: 12, color: "#1da1f2", fontWeight: 600, textDecoration: "none" }}><Twitter size={12} /> Twitter</a>}
                  {startup.social_links?.linkedin && <a href={startup.social_links.linkedin} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, background: "#0a66c215", border: "1px solid #0a66c230", borderRadius: 8, padding: "4px 10px", fontSize: 12, color: "#0a66c2", fontWeight: 600, textDecoration: "none" }}><Linkedin size={12} /> LinkedIn</a>}
                </div>
              </Card>
            </div>
          )}



          {tab === "requests" && (

            <div>
              {/* ── Summary strip ── */}
              {(() => {
                const pendingJoin = requests.filter(r => r.status === "pending" && profiles[r.user_id]).length;
                const totalJoin = requests.filter(r => profiles[r.user_id]).length;
                const pendingPage = pageReqs.filter(r => r.status === "pending").length;
                return (
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 18 }}>
                    {/* RS DEV NOTE: Founder Join Requests summary card hidden per request; kept commented for easy restore.
                    <div style={{ background: dk ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👥</div>
                      <div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: "#6366f1", lineHeight: 1 }}>{pendingJoin}</div>
                        <div style={{ fontSize: 11, color: th.txt3, marginTop: 1 }}>{totalJoin} total</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: th.txt2 }}>Join Requests</div>
                      </div>
                    </div>
                    */}
                    <div style={{ background: dk ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🔐</div>
                      <div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: "#10b981", lineHeight: 1 }}>{pendingPage}</div>
                        <div style={{ fontSize: 11, color: th.txt3, marginTop: 1 }}>{pageReqs.length} total</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: th.txt2 }}>Page Requests</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── Page access requests ── */}
              {pageReqs.length > 0 && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ flex: 1, height: 1, background: th.bdr }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: th.txt3, textTransform: "uppercase", letterSpacing: 0.8, whiteSpace: "nowrap" }}>🔐 Page Access Requests</span>
                    <div style={{ flex: 1, height: 1, background: th.bdr }} />
                  </div>
                  {pageReqs.map(req => {
                    const prof = profiles[req.user_id] || { name: "Member" };
                    // Try exact ID match first, then name-based fallback for local_pg_ mismatches
                    const pg = pages.find(p => p.id === req.page_id)
                      || (req.page_name ? pages.find(p => p.name === req.page_name) : null);
                    const pt = PAGE_TYPES.find(p => p.id === (pg?.type_id || req.page_type_id)) || PAGE_TYPES[0];
                    const displayName = pg?.name || req.page_name || null;
                    const isPending = req.status === "pending";
                    const statusColor = req.status === "approved" ? "#10b981" : req.status === "rejected" ? "#ef4444" : "#f59e0b";
                    const statusBg = req.status === "approved" ? "#10b98112" : req.status === "rejected" ? "#ef444412" : "#f59e0b12";
                    return (
                      <div key={req.id} style={{ background: th.surf, border: `1px solid ${isPending ? "#10b98130" : th.bdr}`, borderRadius: 16, padding: "14px 16px", marginBottom: 10, animation: "fadeUp 0.2s ease both" }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <div onClick={() => setViewingProfile(req.user_id)} style={{ cursor: "pointer", flexShrink: 0 }}>
                            <Av profile={prof} size={42} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                              <div onClick={() => setViewingProfile(req.user_id)} style={{ cursor: "pointer", minWidth: 0 }}>
                                <div style={{ fontWeight: 800, fontSize: 14, color: th.txt }}>{prof.name}</div>
                                <div style={{ fontSize: 11, color: th.txt3 }}>@{prof.handle || req.user_id?.slice(0, 8)}</div>
                              </div>
                              <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: statusBg, color: statusColor, border: `1px solid ${statusColor}30` }}>
                                {req.status === "approved" ? "✓ Approved" : req.status === "rejected" ? "✕ Rejected" : "⏳ Pending"}
                              </span>
                            </div>
                            {/* Requested page chip */}
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                              <span style={{ fontSize: 11, color: th.txt3, fontWeight: 600 }}>Requested page:</span>
                              {displayName ? (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: `${pt.c}18`, border: `1px solid ${pt.c}35`, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700, color: pt.c }}>
                                  <pt.icon size={13} color={pt.c} /> {displayName}
                                </span>
                              ) : (
                                <span style={{ fontSize: 11, color: th.txt3, fontStyle: "italic" }}>Unknown page</span>
                              )}
                            </div>
                            {/* Actions */}
                            {isPending && (
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  onClick={() => approvePageReq(req)}
                                  style={{ display: "flex", alignItems: "center", gap: 5, background: "linear-gradient(135deg,#10b981,#059669)", border: "none", borderRadius: 9, padding: "7px 16px", cursor: "pointer", color: "#fff", fontSize: 12, fontWeight: 700, boxShadow: "0 2px 8px #10b98125" }}
                                  data-testid={`button-approve-page-req-${req.id}`}
                                >✓ Approve Access</button>
                                <button
                                  onClick={() => rejectPageReq(req)}
                                  style={{ display: "flex", alignItems: "center", gap: 5, background: "#ef444412", border: "1px solid #ef444430", borderRadius: 9, padding: "7px 14px", cursor: "pointer", color: "#ef4444", fontSize: 12, fontWeight: 700 }}
                                  data-testid={`button-reject-page-req-${req.id}`}
                                >✕ Reject</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {pageReqs.length === 0 && (
                    <div style={{ textAlign: "center", padding: "16px 0", color: th.txt3, fontSize: 13 }}>No page requests from known users.</div>
                  )}
                  <div style={{ marginBottom: 18 }} />
                </>
              )}



              {/* ── Startup join requests ── */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, height: 1, background: th.bdr }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: th.txt3, textTransform: "uppercase", letterSpacing: 0.8, whiteSpace: "nowrap" }}>👥 Startup Join Requests</span>
                <div style={{ flex: 1, height: 1, background: th.bdr }} />
              </div>

              {requests.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0 8px", color: th.txt3, fontSize: 13 }}>📬 No join requests yet.</div>
              ) : requests.map(req => {
                const prof = profiles[req.user_id] || { name: "Applicant" };
                const statusColor = req.status === "approved" ? "#10b981" : req.status === "rejected" ? "#ef4444" : "#f59e0b";
                const statusBg = req.status === "approved" ? "#10b98112" : req.status === "rejected" ? "#ef444412" : "#f59e0b12";
                return (
                  <div key={req.id} style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 16, padding: "16px", marginBottom: 10, animation: "fadeUp 0.2s ease both" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div onClick={() => setViewingProfile(req.user_id)} style={{ cursor: "pointer", flexShrink: 0 }}>
                        <Av profile={prof} size={46} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Header row */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                          <div onClick={() => setViewingProfile(req.user_id)} style={{ cursor: "pointer", minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 14, color: th.txt }}>{prof.name}</div>
                            <div style={{ fontSize: 12, color: th.txt3 }}>@{prof.handle || req.user_id?.slice(0, 8)}</div>
                          </div>
                          <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 99, background: statusBg, color: statusColor, border: `1px solid ${statusColor}30` }}>
                            {req.status === "approved" ? "✓ Approved" : req.status === "rejected" ? "✕ Rejected" : "⏳ Pending"}
                          </span>
                        </div>

                        {/* Roles */}
                        {(req.selected_roles || []).length > 0 && (
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                            {(req.selected_roles || []).map(rid => { const r = JOIN_ROLES.find(x => x.id === rid); return r ? <span key={rid} style={{ background: `${r.c}18`, color: r.c, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, border: `1px solid ${r.c}30`, display: "inline-flex", alignItems: "center", gap: 5 }}><r.icon size={11} color={r.c} /> {r.label}</span> : null; })}
                          </div>
                        )}

                        {/* Message */}
                        {req.message && (
                          <div style={{ background: dk ? "rgba(255,255,255,0.04)" : "#f8fafc", border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "8px 12px", marginBottom: 10 }}>
                            <span style={{ fontSize: 11, color: th.txt3, fontWeight: 600 }}>Message: </span>
                            <span style={{ fontSize: 12, color: th.txt2, fontStyle: "italic" }}>"{req.message}"</span>
                          </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          {req.status === "pending" && (
                            <>
                              <button onClick={() => approveRequest(req)} style={{ display: "flex", alignItems: "center", gap: 5, background: "linear-gradient(135deg,#10b981,#059669)", border: "none", borderRadius: 9, padding: "7px 16px", cursor: "pointer", color: "#fff", fontSize: 12, fontWeight: 700, boxShadow: "0 2px 8px #10b98130" }}>✓ Approve</button>
                              <button onClick={() => rejectRequest(req)} style={{ display: "flex", alignItems: "center", gap: 5, background: "#ef444412", border: "1px solid #ef444430", borderRadius: 9, padding: "7px 14px", cursor: "pointer", color: "#ef4444", fontSize: 12, fontWeight: 700 }}>✕ Reject</button>
                            </>
                          )}
                          <button onClick={() => deleteRequest(req)} title="Delete" style={{ marginLeft: "auto", background: "none", border: `1px solid ${th.bdr}`, cursor: "pointer", color: th.txt3, padding: "5px 8px", borderRadius: 8, display: "flex", alignItems: "center" }}><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

            </div>
          )}

          {tab === "pages" && (
            <div>
              {!isGrowthPlan && (
                <div style={{ background: dk ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.05)", border: `1px solid ${th.bdr}`, borderRadius: 14, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: th.txt, display: "flex", alignItems: "center", gap: 6 }}>
                      📌 Founder Starter Plan: Default Pages Only
                    </div>
                    <div style={{ fontSize: 11, color: th.txt3, marginTop: 2 }}>You can manage default pages. Custom page creation is available on Founder Growth plan.</div>
                  </div>
                  <button onClick={openSubscriptionModal} style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)", border: "none", borderRadius: 10, padding: "6px 14px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 3px 10px rgba(139,92,246,0.3)" }}>
                    <Crown size={14} /> Upgrade to Growth
                  </button>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <button onClick={handleToggleAddPage} style={{ display: "flex", alignItems: "center", gap: 6, background: isGrowthPlan ? "#3b82f6" : "rgba(99,102,241,0.15)", border: isGrowthPlan ? "none" : `1px solid ${th.bdr}`, borderRadius: 10, padding: "8px 14px", color: isGrowthPlan ? "#fff" : th.txt2, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {!isGrowthPlan && <Lock size={13} color="#f59e0b" />} <PlusCircle size={14} /> Add Page
                </button>
              </div>
              {showAddPage && (
                <Card dk={dk} anim={false} style={{ marginBottom: 12, position: "relative", zIndex: 50 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <input value={newPageName} onChange={e => setNewPageName(e.target.value)} placeholder="Page name" style={{ ...inp, flex: 1 }} />
                    <GlassDropdown
                      value={newPageType}
                      onChange={setNewPageType}
                      options={PAGE_TYPES}
                      dk={dk}
                      style={{ flexShrink: 0 }}
                      width="170px"
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setShowAddPage(false)} style={{ flex: 1, padding: "8px", background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 10, cursor: "pointer", color: th.txt2, fontWeight: 600 }}>Cancel</button>
                    <button onClick={addPage} disabled={!newPageName.trim()} style={{ flex: 2, padding: "8px", background: "#3b82f6", border: "none", borderRadius: 10, cursor: "pointer", color: "#fff", fontWeight: 700 }}>Create Page</button>
                  </div>
                </Card>
              )}
              {pages.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: th.txt3 }}>
                  <FileText size={36} color={th.txt3} style={{ margin: "0 auto 12px", opacity: 0.7 }} />
                  <p style={{ margin: 0, fontSize: 14 }}>No pages yet.</p>
                </div>
              ) : pages.map(pg => {
                const pt = PAGE_TYPES.find(p => p.id === pg.type_id) || PAGE_TYPES[0];
                const pgMems = pageMembers.filter(m => m.page_id === pg.id);
                const pgPendingReqs = pageReqs.filter(r => r.page_id === pg.id && r.status === "pending");
                const creatorProf = profiles[pg.created_by] || null;
                const isExpanded = expandedMember === `pg_${pg.id}`;
                return (
                  <Card dk={dk} key={pg.id} anim={false} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1, minWidth: 0 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${pt.c}18`, border: `1px solid ${pt.c}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <pt.icon size={18} color={pt.c} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: th.txt, fontSize: 14 }}>{pg.name}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                            {creatorProf && <><span style={{ fontSize: 11, color: th.txt3 }}>by</span><div style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }} onClick={() => setViewingProfile(pg.created_by)}><Av profile={creatorProf} size={16} /><span style={{ fontSize: 11, fontWeight: 600, color: th.txt2 }}>{creatorProf.name}</span></div></>}
                            <span style={{ fontSize: 11, color: th.txt3 }}>· {pgMems.length} member{pgMems.length !== 1 ? "s" : ""}</span>
                            {pgPendingReqs.length > 0 && <span style={{ background: "#ef444418", color: "#ef4444", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, border: "1px solid #ef444430" }}>{pgPendingReqs.length} pending</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                        <button onClick={() => setExpandedMember(isExpanded ? null : `pg_${pg.id}`)} style={{ background: isExpanded ? `${pt.c}20` : th.surf2, border: `1px solid ${isExpanded ? pt.c + "40" : th.bdr}`, borderRadius: 8, padding: "5px 9px", cursor: "pointer", color: isExpanded ? pt.c : th.txt3, fontSize: 11, fontWeight: 600 }}>👥 Manage</button>
                        <button onClick={() => setActivePage(pg)} style={{ display: "flex", alignItems: "center", gap: 4, background: `${pt.c}18`, border: `1px solid ${pt.c}30`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: pt.c, fontSize: 12, fontWeight: 700 }}><LogIn size={12} /> Enter</button>
                        <button onClick={() => deletePage(pg.id)} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3, display: "flex", padding: 6 }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${th.bdr}` }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: th.txt3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Members with access</div>
                        {pgMems.length === 0 ? (
                          <div style={{ fontSize: 12, color: th.txt3, padding: "6px 0" }}>No members yet — grant access from Requests tab.</div>
                        ) : pgMems.map(mem => {
                          const mp = profiles[mem.user_id] || { name: "Member" };
                          return (
                            <div key={mem.user_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${th.bdr}` }}>
                              <div onClick={() => setViewingProfile(mem.user_id)} style={{ cursor: "pointer" }}><Av profile={mp} size={26} /></div>
                              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: th.txt }}>{mp.name}</span>
                              <button onClick={() => assignMemberPage(mem.user_id, pg.id)} style={{ background: "#ef444410", border: "1px solid #ef444430", borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: "#ef4444", fontSize: 11, fontWeight: 600 }}>Remove</button>
                            </div>
                          );
                        })}
                        {members.filter(m => !pgMems.find(pm => pm.user_id === m.user_id)).length > 0 && (
                          <>
                            <div style={{ fontSize: 11, fontWeight: 700, color: th.txt3, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 10, marginBottom: 6 }}>Add a member</div>
                            {members.filter(m => !pgMems.find(pm => pm.user_id === m.user_id)).map(m => {
                              const mp = profiles[m.user_id] || { name: "Member" };
                              return (
                                <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                                  <div onClick={() => setViewingProfile(m.user_id)} style={{ cursor: "pointer" }}><Av profile={mp} size={22} /></div>
                                  <span style={{ flex: 1, fontSize: 12, color: th.txt2 }}>{mp.name}</span>
                                  <button onClick={() => assignMemberPage(m.user_id, pg.id)} style={{ background: "#10b98110", border: "1px solid #10b98130", borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: "#10b981", fontSize: 11, fontWeight: 600 }}>+ Add</button>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {tab === "members" && (
            <div>
              {/* View mode toggle */}
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {["all", "bypage"].map(mode => (
                  <button key={mode} onClick={() => setMemberViewMode(mode)} style={{ flex: 1, padding: "7px 0", background: memberViewMode === mode ? "#6366f1" : th.surf2, border: `1px solid ${memberViewMode === mode ? "#6366f1" : th.bdr}`, borderRadius: 9, cursor: "pointer", color: memberViewMode === mode ? "#fff" : th.txt2, fontSize: 12, fontWeight: 700 }}>
                    {mode === "all" ? "👤 All Members" : "📄 By Page"}
                  </button>
                ))}
              </div>

              {memberViewMode === "all" && (
                members.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 48, color: th.txt3 }}><div style={{ fontSize: 36 }}>👥</div><p>No members yet.</p></div>
                ) : members.map(m => {
                  const prof = profiles[m.user_id] || { name: "Member" };
                  const isFounderMember = (startup.founders || [startup.created_by]).includes(m.user_id);
                  const memberPages = pageMembers.filter(pm => pm.user_id === m.user_id).map(pm => pages.find(p => p.id === pm.page_id)).filter(Boolean);
                  const assignedRoles = memberRoles[m.user_id] || [];
                  const isExpandedM = expandedMember === `m_${m.user_id}`;
                  const ROLE_OPTS = [
                    { id: "developer", icon: Terminal, c: "#3b82f6", label: "Dev" },
                    { id: "designer", icon: Palette, c: "#ec4899", label: "Design" },
                    { id: "marketer", icon: Megaphone, c: "#f97316", label: "Marketing" },
                    { id: "advisor", icon: Award, c: "#8b5cf6", label: "Advisor" },
                    { id: "investor", icon: CircleDollarSign, c: "#10b981", label: "Investor" }
                  ];
                  return (
                    <Card dk={dk} key={m.user_id} anim={false} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div onClick={() => setViewingProfile(m.user_id)} style={{ cursor: "pointer", flexShrink: 0 }}><Av profile={prof} size={42} bal={bals[m.user_id] ?? 0} /></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                            <div>
                              <div style={{ fontWeight: 700, color: th.txt, fontSize: 14 }}>{prof.name}</div>
                              <div style={{ fontSize: 12, color: th.txt3 }}>@{prof.handle || m.user_id.slice(0, 8)}</div>
                            </div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              {isFounderMember && <span style={{ background: "#f59e0b18", color: "#f59e0b", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, border: "1px solid #f59e0b30" }}>FOUNDER</span>}
                              <button onClick={() => setExpandedMember(isExpandedM ? null : `m_${m.user_id}`)} style={{ background: isExpandedM ? "#6366f118" : th.surf2, border: `1px solid ${isExpandedM ? "#6366f140" : th.bdr}`, borderRadius: 7, padding: "3px 8px", cursor: "pointer", color: isExpandedM ? "#6366f1" : th.txt3, fontSize: 11, fontWeight: 600 }}>⚙ Roles</button>
                              {!isFounderMember && m.user_id !== me && <button onClick={() => removeMember(m.user_id)} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3, display: "flex", padding: 4 }}><X size={14} /></button>}
                            </div>
                          </div>
                          {/* Page & role badges */}
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: memberPages.length > 0 || assignedRoles.length > 0 ? 4 : 0 }}>
                            {memberPages.map(pg => { const pt = PAGE_TYPES.find(p => p.id === pg.type_id) || PAGE_TYPES[0]; return <span key={pg.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: `${pt.c}18`, color: pt.c, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 6, border: `1px solid ${pt.c}30` }}><pt.icon size={11} color={pt.c} /> {pg.name}</span>; })}
                            {assignedRoles.map(r => { const ro = ROLE_OPTS.find(o => o.id === r); return ro ? <span key={r} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: `${ro.c}18`, color: ro.c, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 6, border: `1px solid ${ro.c}30` }}><ro.icon size={11} color={ro.c} /> {ro.label}</span> : null; })}
                          </div>
                          {/* Role assignment UI */}
                          {isExpandedM && (
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${th.bdr}` }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: th.txt3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Assign Roles</div>
                              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                                {ROLE_OPTS.map(ro => {
                                  const active = assignedRoles.includes(ro.id);
                                  const Icon = ro.icon;
                                  return <button key={ro.id} onClick={() => assignMemberRole(m.user_id, ro.id)} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: active ? `${ro.c}20` : th.surf2, border: `1px solid ${active ? ro.c + "50" : th.bdr}`, borderRadius: 7, padding: "4px 9px", cursor: "pointer", color: active ? ro.c : th.txt3, fontSize: 11, fontWeight: active ? 700 : 500 }}><Icon size={11} color={active ? ro.c : th.txt3} /> {ro.label}</button>;
                                })}
                              </div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: th.txt3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Page Access</div>
                              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                {pages.map(pg => {
                                  const pt = PAGE_TYPES.find(p => p.id === pg.type_id) || PAGE_TYPES[0];
                                  const hasPg = pageMembers.find(pm => pm.user_id === m.user_id && pm.page_id === pg.id);
                                  return <button key={pg.id} onClick={() => assignMemberPage(m.user_id, pg.id)} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: hasPg ? `${pt.c}20` : th.surf2, border: `1px solid ${hasPg ? pt.c + "50" : th.bdr}`, borderRadius: 7, padding: "4px 9px", cursor: "pointer", color: hasPg ? pt.c : th.txt3, fontSize: 11, fontWeight: hasPg ? 700 : 500 }}><pt.icon size={11} color={hasPg ? pt.c : th.txt3} /> {pg.name}</button>;
                                })}
                                {pages.length === 0 && <span style={{ fontSize: 11, color: th.txt3 }}>No pages yet.</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}

              {memberViewMode === "bypage" && (
                pages.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: th.txt3 }}><FileText size={36} color={th.txt3} style={{ margin: "0 auto 8px" }} /><p>No pages yet.</p></div>
                ) : pages.map(pg => {
                  const pt = PAGE_TYPES.find(p => p.id === pg.type_id) || PAGE_TYPES[0];
                  const pgMems = pageMembers.filter(pm => pm.page_id === pg.id);
                  return (
                    <div key={pg.id} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${pt.c}18`, border: `1px solid ${pt.c}30`, display: "flex", alignItems: "center", justifyContent: "center" }}><pt.icon size={12} color={pt.c} /></div>
                        <span style={{ fontWeight: 700, fontSize: 13, color: th.txt }}>{pg.name}</span>
                        <span style={{ fontSize: 11, color: th.txt3 }}>· {pgMems.length} member{pgMems.length !== 1 ? "s" : ""}</span>
                      </div>
                      {pgMems.length === 0 ? (
                        <div style={{ fontSize: 12, color: th.txt3, padding: "4px 8px" }}>No members with access.</div>
                      ) : pgMems.map(pm => {
                        const prof = profiles[pm.user_id] || { name: "Member" };
                        return (
                          <div key={pm.user_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: th.surf2, marginBottom: 5 }}>
                            <div onClick={() => setViewingProfile(pm.user_id)} style={{ cursor: "pointer" }}><Av profile={prof} size={28} /></div>
                            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: th.txt }}>{prof.name}</span>
                            <span style={{ fontSize: 11, color: th.txt3 }}>@{prof.handle || pm.user_id.slice(0, 8)}</span>
                            <button onClick={() => assignMemberPage(pm.user_id, pg.id)} style={{ background: "#ef444410", border: "1px solid #ef444430", borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: "#ef4444", fontSize: 11, fontWeight: 600 }}>✕</button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === "meetings" && <ComingSoonMeetings dk={dk} addNotif={addNotif} />}

          {tab === "updates" && (
            <div>
              <Card dk={dk} anim={false} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: th.txt, fontSize: 14, marginBottom: 10 }}>📢 Post an Update</div>
                <textarea value={updateText} onChange={e => setUpdateText(e.target.value)} placeholder="Share what's new with your startup…" rows={3} style={{ width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, outline: "none", color: th.txt, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 10 }} />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={postUpdate} disabled={!updateText.trim() || posting} style={{ display: "flex", alignItems: "center", gap: 6, background: updateText.trim() ? "#3b82f6" : th.surf2, border: "none", borderRadius: 10, padding: "8px 16px", color: updateText.trim() ? "#fff" : th.txt3, fontWeight: 700, fontSize: 13, cursor: updateText.trim() ? "pointer" : "default" }}><Send size={13} />{posting ? "Posting…" : "Post Update"}</button>
                </div>
              </Card>
              {updates.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: th.txt3 }}><Megaphone size={36} color={th.txt3} style={{ margin: "0 auto 8px" }} /><p>No updates yet.</p></div>
                : updates.map(u => {
                  const prof = profiles[u.created_by] || { name: "Founder" };
                  return (
                    <Card dk={dk} key={u.id} anim={false}>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <Av profile={prof} size={36} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: th.txt }}>{prof.name}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 11, color: th.txt3 }}>{ago(new Date(u.created_at).getTime())}</span>
                              {u.created_by === me && <button onClick={() => deleteUpdate(u.id)} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3, padding: 2, display: "flex" }}><Trash2 size={12} /></button>}
                            </div>
                          </div>
                          <p style={{ margin: 0, fontSize: 13, color: th.txt2, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{u.content}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </div>
          )}

          {tab === "products" && <ProductsServicesSection startup={startup} isFounder={true} me={me} dk={dk} addNotif={addNotif} myProfile={myProfile} openSubscriptionModal={openSubscriptionModal} />}
          {tab === "feedback" && <FeedbackSection startupId={startup.id} me={me} profiles={profiles} dk={dk} />}
        </>
      )}
    </div>
  );
}

// ─── StartupDetail dispatcher ──────────────────────────────────────
function StartupDetail({ startup, me, profiles, bals, dk, onBack, addNotif, onStartupUpdated, isMobile, initialTab = "overview", myProfile, openSubscriptionModal }) {
  const isFounder = startup.created_by === me || (startup.founders || []).includes(me);
  if (isFounder) return <FounderDetail startup={startup} me={me} profiles={profiles} bals={bals} dk={dk} onBack={onBack} addNotif={addNotif} onStartupUpdated={onStartupUpdated} isMobile={isMobile} initialTab={initialTab} myProfile={myProfile} openSubscriptionModal={openSubscriptionModal} />;
  return <VisitorDetail startup={startup} me={me} profiles={profiles} dk={dk} onBack={onBack} addNotif={addNotif} isMobile={isMobile} initialTab={initialTab} myProfile={myProfile} openSubscriptionModal={openSubscriptionModal} />;
}

// ─── Membership Modal Component ─────────────────────────────────────
function MembershipModal({ dk, onClose, isMobile, onSelectPlan }) {
  const th = T(dk);
  const [activeFaq, setActiveFaq] = useState(null);
  const [step, setStep] = useState('pricing'); // 'pricing' | 'checkout'
  const [selectedPlan, setSelectedPlan] = useState(null); // 'starter' | 'growth'

  // Checkout Form State
  const [paymentMethod, setPaymentMethod] = useState("card"); // 'card' | 'paypal' | 'gpay'
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const faqs = [
    {
      q: "Can I access Fundraising without a subscription?",
      a: "No. Fundraising is available only to verified startup members to maintain a trusted ecosystem for founders and investors."
    },
    {
      q: "Why is there a subscription?",
      a: "The subscription helps us verify startups, reduce spam, maintain quality deal flow, and ensure investors receive only genuine opportunities."
    },
    {
      q: "Does subscribing guarantee funding?",
      a: "No. RightSignal provides access to fundraising opportunities, investor discovery, and application tools. Investment decisions are made solely by investors and funding partners."
    },
    {
      q: "Can anyone view my startup?",
      a: "Yes. Your startup profile can be discovered through the Collab section, helping you gain visibility among founders, customers, collaborators, and investors."
    }
  ];

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setStep('checkout');
  };

  const simulatePayment = async (isDemo = false) => {
    setIsProcessing(true);
    // Simulate short loader delay for premium UX
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsProcessing(false);
    onSelectPlan(selectedPlan);
  };

  const getPlanDetails = () => {
    if (selectedPlan === 'growth') {
      return { name: "Growth Membership", price: "₹1,299/mo", desc: "For growth-stage & fundraising-ready startups." };
    }
    return { name: "Starter Membership", price: "₹499/mo", desc: "For early-stage startups building credibility." };
  };

  return createPortal(
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0, 0, 0, 0.8)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      zIndex: 99999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: isMobile ? "10px" : "30px 20px",
      boxSizing: "border-box"
    }} onClick={onClose}>
      <div style={{
        background: dk ? "rgba(13, 20, 38, 0.96)" : "#ffffff",
        border: `1px solid ${th.bdr}`,
        borderRadius: 24,
        width: "100%",
        maxWidth: 820,
        maxHeight: "92vh",
        overflowY: "auto",
        boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.6)",
        animation: "fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both",
        position: "relative",
        boxSizing: "border-box"
      }} onClick={e => e.stopPropagation()}>

        {/* Sticky Header */}
        <div style={{
          position: "sticky",
          top: 0,
          background: dk ? "rgba(13, 20, 38, 0.98)" : "#ffffff",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: `1px solid ${th.bdr}`,
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 100
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {step === 'checkout' && (
              <button
                onClick={() => setStep('pricing')}
                style={{
                  background: "none",
                  border: "none",
                  color: th.txt2,
                  cursor: "pointer",
                  padding: "4px 8px",
                  display: "flex",
                  alignItems: "center",
                  fontSize: 13,
                  fontWeight: 700
                }}
              >
                ← Back
              </button>
            )}
            <Crown size={20} color="#f59e0b" />
            <span style={{ fontSize: 15, fontWeight: 800, color: th.txt, letterSpacing: "-0.3px" }}>
              {step === 'checkout' ? "COMPLETE CHECKOUT" : "RIGHTSIGNAL MEMBERSHIP"}
            </span>
          </div>
          <button onClick={onClose} style={{
            background: dk ? "rgba(255, 255, 255, 0.08)" : "#f1f5f9",
            border: "none",
            borderRadius: "50%",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: th.txt2,
            transition: "all 0.2s"
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "rotate(90deg)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "rotate(0)"; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: isMobile ? "20px 16px" : "28px 24px" }}>

          {step === 'pricing' ? (
            <>
              {/* Hero Section */}
              <div style={{ textAlign: "center", marginBottom: 36 }}>
                <h1 style={{
                  fontSize: isMobile ? 24 : 32,
                  fontWeight: 900,
                  color: th.txt,
                  margin: "0 0 12px 0",
                  background: "linear-gradient(135deg, #6366f1, #a855f7)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.5px"
                }}>
                  Build. Showcase. Raise Capital.
                </h1>
                <p style={{
                  fontSize: 14,
                  color: th.txt2,
                  maxWidth: 580,
                  margin: "0 auto 18px",
                  lineHeight: 1.6
                }}>
                  Access the private startup ecosystem on RightSignal.
                </p>
                <p style={{
                  fontSize: 14,
                  color: th.txt2,
                  maxWidth: 580,
                  margin: "0 auto 18px",
                  lineHeight: 1.6
                }}>
                  Create your startup profile, showcase your products, connect with customers, and unlock fundraising opportunities through our verified founder network.
                </p>

                {/* ALERT */}
                <div style={{
                  background: dk ? "rgba(99, 102, 241, 0.1)" : "rgba(99, 102, 241, 0.05)",
                  border: "1px solid rgba(99, 102, 241, 0.25)",
                  borderRadius: 12,
                  padding: "10px 16px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#6366f1",
                  textAlign: "left"
                }}>
                  <Shield size={14} style={{ flexShrink: 0 }} /> Only verified startup members can access the Fundraising section.
                </div>
              </div>

              {/* PRICING PLANS */}
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: 24,
                marginBottom: 36
              }}>

                {/* Starter Plan */}
                <div style={{
                  background: dk ? "rgba(30, 41, 59, 0.4)" : "#f8fafc",
                  border: `1px solid ${th.bdr}`,
                  borderRadius: 20,
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  transition: "all 0.3s ease"
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Starter Plan</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                    <span style={{ fontSize: 32, fontWeight: 900, color: th.txt }}>₹499</span>
                    <span style={{ fontSize: 13, color: th.txt3 }}>(3 Months Access)</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700, marginBottom: 16 }}>
                    Launch Offer: Only for the first 1,000 founders
                  </div>

                  <div style={{ borderTop: `1px solid ${th.bdr}`, paddingTop: 16, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: th.txt3, textTransform: "uppercase", marginBottom: 12 }}>Includes</div>
                    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px 0", display: "flex", flexDirection: "column", gap: 8 }}>
                      <li style={{ fontSize: 12, color: th.txt2, display: "flex", alignItems: "center", gap: 8 }}><Check size={14} style={{ color: "#10b981", flexShrink: 0 }} /> Founder Networking</li>
                      <li style={{ fontSize: 12, color: th.txt2, display: "flex", alignItems: "center", gap: 8 }}><Check size={14} style={{ color: "#10b981", flexShrink: 0 }} /> Team Management (Up to 3 Members)</li>
                      <li style={{ fontSize: 12, color: th.txt2, display: "flex", alignItems: "center", gap: 8 }}><Check size={14} style={{ color: "#10b981", flexShrink: 0 }} /> Events & Meetings</li>
                      <li style={{ fontSize: 12, color: th.txt2, display: "flex", alignItems: "center", gap: 8 }}><Check size={14} style={{ color: "#10b981", flexShrink: 0 }} /> Document Storage (100MB)</li>
                      <li style={{ fontSize: 12, color: th.txt2, display: "flex", alignItems: "center", gap: 8 }}><Check size={14} style={{ color: "#10b981", flexShrink: 0 }} /> Notifications & Reminders</li>
                    </ul>

                    <div style={{ borderTop: `1px dashed ${th.bdr}`, paddingTop: 16, marginBottom: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: th.txt3, textTransform: "uppercase", marginBottom: 12 }}>Unlock with Pro</div>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, opacity: 0.6 }}>
                        <li style={{ fontSize: 11, color: th.txt3, display: "flex", alignItems: "center", gap: 8 }}><Lock size={11} style={{ color: th.txt3, flexShrink: 0 }} /> CRM</li>
                        <li style={{ fontSize: 11, color: th.txt3, display: "flex", alignItems: "center", gap: 8 }}><Lock size={11} style={{ color: th.txt3, flexShrink: 0 }} /> AI Investor Connect</li>
                        <li style={{ fontSize: 11, color: th.txt3, display: "flex", alignItems: "center", gap: 8 }}><Lock size={11} style={{ color: th.txt3, flexShrink: 0 }} /> AI Client Discovery</li>
                        <li style={{ fontSize: 11, color: th.txt3, display: "flex", alignItems: "center", gap: 8 }}><Lock size={11} style={{ color: th.txt3, flexShrink: 0 }} /> AI Business Matchmaking</li>
                        <li style={{ fontSize: 11, color: th.txt3, display: "flex", alignItems: "center", gap: 8 }}><Lock size={11} style={{ color: th.txt3, flexShrink: 0 }} /> Deal Pipeline</li>
                        <li style={{ fontSize: 11, color: th.txt3, display: "flex", alignItems: "center", gap: 8 }}><Lock size={11} style={{ color: th.txt3, flexShrink: 0 }} /> Analytics</li>
                        <li style={{ fontSize: 11, color: th.txt3, display: "flex", alignItems: "center", gap: 8 }}><Lock size={11} style={{ color: th.txt3, flexShrink: 0 }} /> Mentor Network</li>
                        <li style={{ fontSize: 11, color: th.txt3, display: "flex", alignItems: "center", gap: 8 }}><Lock size={11} style={{ color: th.txt3, flexShrink: 0 }} /> Gmail, LinkedIn & Calendar Sync</li>
                      </ul>
                    </div>
                  </div>

                  <button onClick={() => handleSelectPlan('starter')} style={{
                    background: "linear-gradient(135deg, #3b82f6, #4f46e5)",
                    border: "none",
                    borderRadius: 12,
                    padding: "12px 24px",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                    marginTop: 24,
                    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "transform 0.2s"
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.02)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}
                  >
                    Get Started →
                  </button>
                </div>

                {/* Pro Plan */}
                <div style={{
                  background: dk ? "linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(99, 102, 241, 0.08))" : "linear-gradient(135deg, #ffffff, rgba(99, 102, 241, 0.03))",
                  border: "2px solid #6366f1",
                  borderRadius: 20,
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  transition: "all 0.3s ease",
                  boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.2)"
                }}>
                  {/* Recommended Tag */}
                  <div style={{
                    position: "absolute",
                    top: -12,
                    right: 20,
                    background: "linear-gradient(135deg, #a855f7, #6366f1)",
                    color: "#ffffff",
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "4px 12px",
                    borderRadius: 20,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    boxShadow: "0 4px 10px rgba(99, 102, 241, 0.3)"
                  }}>
                    Recommended
                  </div>

                  <div style={{ fontSize: 14, fontWeight: 800, color: "#6366f1", marginTop: 6, marginBottom: 4 }}>Pro Plan (Recommended)</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 16 }}>
                    <span style={{ fontSize: 32, fontWeight: 900, color: th.txt }}>₹1,299</span>
                    <span style={{ fontSize: 14, color: th.txt3 }}>/ Month</span>
                  </div>

                  <div style={{ borderTop: `1px solid ${th.bdr}`, paddingTop: 16, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: th.txt3, textTransform: "uppercase", marginBottom: 12 }}>Everything in Starter, plus:</div>
                    <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px 0", display: "flex", flexDirection: "column", gap: 9 }}>
                      <li style={{ fontSize: 12, color: th.txt2, display: "flex", alignItems: "center", gap: 8 }}><Star size={13} style={{ color: "#a855f7", flexShrink: 0 }} /> CRM for Leads, Investors & Clients</li>
                      <li style={{ fontSize: 12, color: th.txt2, display: "flex", alignItems: "center", gap: 8 }}><Star size={13} style={{ color: "#a855f7", flexShrink: 0 }} /> AI Investor Matching</li>
                      <li style={{ fontSize: 12, color: th.txt2, display: "flex", alignItems: "center", gap: 8 }}><Star size={13} style={{ color: "#a855f7", flexShrink: 0 }} /> AI Client Discovery</li>
                      <li style={{ fontSize: 12, color: th.txt2, display: "flex", alignItems: "center", gap: 8 }}><Star size={13} style={{ color: "#a855f7", flexShrink: 0 }} /> AI Business Matchmaking</li>
                      <li style={{ fontSize: 12, color: th.txt2, display: "flex", alignItems: "center", gap: 8 }}><Star size={13} style={{ color: "#a855f7", flexShrink: 0 }} /> AI Outreach Assistant</li>
                      <li style={{ fontSize: 12, color: th.txt2, display: "flex", alignItems: "center", gap: 8 }}><Star size={13} style={{ color: "#a855f7", flexShrink: 0 }} /> Deal Pipeline</li>
                      <li style={{ fontSize: 12, color: th.txt2, display: "flex", alignItems: "center", gap: 8 }}><Star size={13} style={{ color: "#a855f7", flexShrink: 0 }} /> Analytics Dashboard</li>
                      <li style={{ fontSize: 12, color: th.txt2, display: "flex", alignItems: "center", gap: 8 }}><Star size={13} style={{ color: "#a855f7", flexShrink: 0 }} /> Gmail, LinkedIn & Calendar Integration</li>
                      <li style={{ fontSize: 12, color: th.txt2, display: "flex", alignItems: "center", gap: 8 }}><Star size={13} style={{ color: "#a855f7", flexShrink: 0 }} /> Mentor & Advisor Network</li>
                      <li style={{ fontSize: 12, color: th.txt2, display: "flex", alignItems: "center", gap: 8 }}><Star size={13} style={{ color: "#a855f7", flexShrink: 0 }} /> Unlimited Document Storage</li>
                      <li style={{ fontSize: 12, color: th.txt2, display: "flex", alignItems: "center", gap: 8 }}><Star size={13} style={{ color: "#a855f7", flexShrink: 0 }} /> Priority Support</li>
                    </ul>

                    <div style={{ borderTop: `1px dashed ${th.bdr}`, paddingTop: 12, marginTop: 12, marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: th.txt3, textTransform: "uppercase", marginBottom: 6 }}>Exclusive</div>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                        <li style={{ fontSize: 11, color: th.txt2, display: "flex", alignItems: "center", gap: 8 }}>✨ Warm Investor Introductions</li>
                        <li style={{ fontSize: 11, color: th.txt2, display: "flex", alignItems: "center", gap: 8 }}>✨ Access to Private Funding Networks</li>
                      </ul>
                    </div>
                  </div>

                  <button onClick={() => handleSelectPlan('growth')} style={{
                    background: "linear-gradient(135deg, #6366f1, #a855f7)",
                    border: "none",
                    borderRadius: 12,
                    padding: "12px 24px",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                    marginTop: 24,
                    boxShadow: "0 4px 12px rgba(168, 85, 247, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "transform 0.2s"
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.02)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}
                  >
                    Get Started →
                  </button>
                </div>

              </div>

              {/* WHY IS FUNDRAISING PRIVATE */}
              <div style={{
                background: dk ? "rgba(30, 41, 59, 0.3)" : "#f8fafc",
                border: `1px solid ${th.bdr}`,
                borderRadius: 20,
                padding: 24,
                marginBottom: 36
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "rgba(99, 102, 241, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <Shield size={16} color="#6366f1" />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: th.txt, margin: 0 }}>Why is Fundraising Private?</h3>
                </div>
                <p style={{ fontSize: 13, color: th.txt2, margin: "0 0 16px 0", lineHeight: 1.6 }}>
                  Every investor, venture partner, family office, and strategic funding partner on RightSignal receives startup applications from our platform. To protect their time and maintain a high-quality ecosystem, we only allow verified startup members to submit fundraising applications.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                  <div style={{ display: "flex", gap: 8, fontSize: 13, color: th.txt2, alignItems: "center" }}><Check size={14} style={{ color: "#10b981", flexShrink: 0 }} /> Genuine founders only</div>
                  <div style={{ display: "flex", gap: 8, fontSize: 13, color: th.txt2, alignItems: "center" }}><Check size={14} style={{ color: "#10b981", flexShrink: 0 }} /> Better quality deal flow for investors</div>
                  <div style={{ display: "flex", gap: 8, fontSize: 13, color: th.txt2, alignItems: "center" }}><Check size={14} style={{ color: "#10b981", flexShrink: 0 }} /> Less spam and duplicate applications</div>
                  <div style={{ display: "flex", gap: 8, fontSize: 13, color: th.txt2, alignItems: "center" }}><Check size={14} style={{ color: "#10b981", flexShrink: 0 }} /> Higher trust within the ecosystem</div>
                </div>
                <div style={{ borderTop: `1px solid ${th.bdr}`, marginTop: 16, paddingTop: 16, fontSize: 12, color: th.txt3, fontStyle: "italic", textAlign: "center" }}>
                  This is not a pay-to-pitch model. It's a quality control system that keeps the ecosystem valuable for founders and investors alike.
                </div>
              </div>

              {/* HOW IT WORKS */}
              <div style={{ marginBottom: 36 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: th.txt, textAlign: "center", marginBottom: 24 }}>How It Works</h3>
                <div style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  justifyContent: "space-between",
                  alignItems: isMobile ? "center" : "flex-start",
                  gap: 20
                }}>
                  {[
                    { s: "1", t: "Create Startup", d: "Create your startup profile." },
                    { s: "2", t: "Verify Startup", d: "Complete founder verification." },
                    { s: "3", t: "Showcase Products", d: "List your products and showcase your business." },
                    { s: "4", t: "Access Fundraising", d: "Access the Fundraising section." },
                    { s: "5", t: "Connect with Investors", d: "Apply to relevant investors and funding opportunities." }
                  ].map((step, idx) => (
                    <div key={idx} style={{ flex: 1, minWidth: 120, textAlign: "center", position: "relative" }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #6366f1, #a855f7)",
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: 14,
                        margin: "0 auto 12px"
                      }}>{step.s}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: th.txt, marginBottom: 4 }}>{step.t}</div>
                      <div style={{ fontSize: 11, color: th.txt3, lineHeight: 1.4 }}>{step.d}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* INCLUDED WITH EVERY MEMBERSHIP */}
              <div style={{
                background: dk ? "rgba(99, 102, 241, 0.03)" : "#f8fafc",
                border: `1px solid ${th.bdr}`,
                borderRadius: 20,
                padding: 24,
                marginBottom: 36
              }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: th.txt, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 16, textAlign: "center" }}>
                  Included with Every Membership
                </h3>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 12
                }}>
                  {[
                    "Startup page on RightSignal", "Founder profile", "Product showcase",
                    "Investor-ready company profile", "Startup discovery", "Collaboration workspace",
                    "Team members", "Startup updates", "Fundraising eligibility", "Community exposure"
                  ].map((inc, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: th.txt2 }}>
                      <Check size={14} style={{ color: "#10b981", flexShrink: 0 }} /> {inc}
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQ SECTION */}
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: th.txt, marginBottom: 16 }}>Frequently Asked Questions</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {faqs.map((faq, idx) => {
                    const isOpen = activeFaq === idx;
                    return (
                      <div key={idx} style={{
                        background: dk ? "rgba(255, 255, 255, 0.03)" : "#f8fafc",
                        border: `1px solid ${th.bdr}`,
                        borderRadius: 12,
                        overflow: "hidden"
                      }}>
                        <button
                          onClick={() => setActiveFaq(isOpen ? null : idx)}
                          style={{
                            width: "100%",
                            background: "none",
                            border: "none",
                            padding: "16px 20px",
                            textAlign: "left",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                            color: th.txt,
                            fontWeight: 700,
                            fontSize: 13,
                            outline: "none"
                          }}
                        >
                          <span>{faq.q}</span>
                          <ChevronDown size={16} color={th.txt3} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                        </button>
                        {isOpen && (
                          <div style={{
                            padding: "0 20px 16px 20px",
                            fontSize: 13,
                            color: th.txt2,
                            lineHeight: 1.6
                          }}>
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Additional Inquiry Email Link */}
                <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: th.txt3 }}>
                  If you have more queries, connect with <a href="mailto:hello@rightsignal.social" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 700 }}>hello@rightsignal.social</a>
                </div>
              </div>
            </>
          ) : (
            /* CHECKOUT STEP VIEW */
            <div style={{ display: "flex", flexDirection: "column", gap: 24, animation: "fadeUp 0.2s ease both" }}>

              {/* Selected Plan Banner */}
              <div style={{
                background: dk ? "rgba(99, 102, 241, 0.08)" : "rgba(99, 102, 241, 0.03)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                borderRadius: 16,
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12
              }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: th.txt, margin: "0 0 4px" }}>{getPlanDetails().name}</h3>
                  <p style={{ fontSize: 13, color: th.txt2, margin: 0 }}>{getPlanDetails().desc}</p>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#6366f1" }}>{getPlanDetails().price}</div>
              </div>

              {/* Payment Methods Selection Tab */}
              <div style={{ display: "flex", gap: 10, overflowX: "auto" }}>
                {[
                  { id: "card", label: "Credit/Debit Card", icon: <CreditCard size={14} /> },
                  { id: "paypal", label: "PayPal", icon: <Wallet size={14} /> },
                  { id: "gpay", label: "Google Pay", icon: <Smartphone size={14} /> }
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    style={{
                      flex: 1,
                      minWidth: 120,
                      padding: "10px 14px",
                      borderRadius: 12,
                      background: paymentMethod === m.id ? (dk ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.06)") : th.surf2,
                      border: `1px solid ${paymentMethod === m.id ? "#6366f1" : th.bdr}`,
                      color: paymentMethod === m.id ? "#6366f1" : th.txt2,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      transition: "all 0.2s"
                    }}
                  >
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>

              {/* Dynamic Payment Method View */}
              {paymentMethod === 'card' && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 16, padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: th.txt }}>Card Information</div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, textTransform: "uppercase" }}>Cardholder Name</label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={cardName}
                      onChange={e => setCardName(e.target.value)}
                      style={{ background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "10px 14px", color: th.txt, outline: "none", fontSize: 13 }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, textTransform: "uppercase" }}>Card Number</label>
                    <input
                      type="text"
                      placeholder="•••• •••• •••• ••••"
                      value={cardNumber}
                      onChange={e => setCardNumber(e.target.value)}
                      style={{ background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "10px 14px", color: th.txt, outline: "none", fontSize: 13 }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, textTransform: "uppercase" }}>Expiration Date</label>
                      <input
                        type="text"
                        placeholder="MM / YY"
                        value={cardExpiry}
                        onChange={e => setCardExpiry(e.target.value)}
                        style={{ background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "10px 14px", color: th.txt, outline: "none", fontSize: 13 }}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, textTransform: "uppercase" }}>CVC / CVV</label>
                      <input
                        type="text"
                        placeholder="123"
                        value={cardCvc}
                        onChange={e => setCardCvc(e.target.value)}
                        style={{ background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "10px 14px", color: th.txt, outline: "none", fontSize: 13 }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'paypal' && (
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  background: th.surf2,
                  border: `1px solid ${th.bdr}`,
                  borderRadius: 16,
                  padding: "30px 20px",
                  textAlign: "center"
                }}>
                  <Wallet size={36} color="#6366f1" />
                  <div style={{ fontSize: 14, fontWeight: 700, color: th.txt }}>PayPal International Checkout</div>
                  <p style={{ fontSize: 12, color: th.txt2, margin: 0, maxWidth: 320 }}>
                    You will be redirected to PayPal's secure gateway to authorize your international payment.
                  </p>
                </div>
              )}

              {paymentMethod === 'gpay' && (
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  background: th.surf2,
                  border: `1px solid ${th.bdr}`,
                  borderRadius: 16,
                  padding: "30px 20px",
                  textAlign: "center"
                }}>
                  <Smartphone size={36} color="#6366f1" />
                  <div style={{ fontSize: 14, fontWeight: 700, color: th.txt }}>Google Pay Checkout</div>
                  <p style={{ fontSize: 12, color: th.txt2, margin: 0, maxWidth: 320 }}>
                    Pay swiftly using your cards saved in your Google Account.
                  </p>
                </div>
              )}

              {/* DEMO / TEST BYPASS SECTION */}
              {/* <div style={{
                background: dk ? "rgba(245, 158, 11, 0.08)" : "rgba(245, 158, 11, 0.04)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                borderRadius: 16,
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 10
              }}> */}
              {/* <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>
                  <Sparkles size={14} color="#f59e0b" /> DEMO ACCOUNT PENETRATION
                </div>
                <p style={{ fontSize: 12, color: th.txt2, margin: 0, lineHeight: 1.4 }}>
                  Use our verified demo payment account to instantly penetrate checkout security and simulate payment approvals.
                </p>

                <button
                  onClick={() => simulatePayment(true)}
                  disabled={isProcessing}
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 18px",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)",
                    alignSelf: "flex-start"
                  }}
                >
                  <CreditCard size={14} /> Pay with Demo Account
                </button>
              </div> */}

              {/* SUBMIT / PAY BUTTON */}
              <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                <button
                  onClick={() => setStep('pricing')}
                  disabled={isProcessing}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: `1px solid ${th.bdr}`,
                    borderRadius: 12,
                    padding: "12px 24px",
                    color: th.txt2,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => simulatePayment(false)}
                  disabled={isProcessing}
                  style={{
                    flex: 2,
                    background: "linear-gradient(135deg, #6366f1, #a855f7)",
                    border: "none",
                    borderRadius: 12,
                    padding: "12px 24px",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(99, 102, 241, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  {isProcessing ? "Processing Security Gateway..." : `Pay ${getPlanDetails().price}`}
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main ColabView ────────────────────────────────────────────────
export default function ColabView({ me, dk, profiles, bals, onProfile, addNotif, isMobile = false, myProfile, openSubscriptionModal }) {
  const th = T(dk);
  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedStage, setSelectedStage] = useState("All Stages");
  const [savedIds, setSavedIds] = useState([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const [initialTab, setInitialTab] = useState("overview");
  const [showCreate, setShowCreate] = useState(false);
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [showMembership, setShowMembership] = useState(false);
  const [latestUpdates, setLatestUpdates] = useState({});

  const subPlan = myProfile?.subscription_plan || "free";
  const isSubscribed = subPlan === "starter" || subPlan === "growth";

  const handleCreateStartupClick = () => {
    if (!isSubscribed) {
      addNotif?.({ type: "warning", msg: "🔒 A paid subscription (Starter or Growth) is required to create a startup." });
      openSubscriptionModal?.();
      return;
    }

    const createdCount = myStartups.length;
    if (subPlan === "starter" && createdCount >= 1) {
      addNotif?.({ type: "warning", msg: "🔒 Founder Starter plan allows creating 1 startup. Upgrade to Founder Growth to launch up to 2 startups!" });
      openSubscriptionModal?.();
      return;
    }

    if (subPlan === "growth" && createdCount >= 2) {
      addNotif?.({ type: "warning", msg: "🔒 You have reached the maximum limit of 2 startups for Founder Growth." });
      return;
    }

    setShowCreate(true);
  };

  const load = useCallback(async () => {
    const [rows, savedRows] = await Promise.all([
      db.get("rs_startups", "order=created_at.desc"),
      db.get("rs_saved_startups", `user_id=eq.${me}`),
    ]);
    setStartups(rows || []);
    setSavedIds((savedRows || []).map(r => r.startup_id));
    if (rows?.length) {
      const ids = rows.map(s => s.id);
      const upds = await db.get("rs_startup_updates", `startup_id=in.(${ids.join(",")})&order=created_at.desc`);
      const map = {};
      (upds || []).forEach(u => { if (!map[u.startup_id]) map[u.startup_id] = u; });
      setLatestUpdates(map);
    }
    setLoading(false);
  }, [me]);

  useEffect(() => { load(); }, [load]);

  const toggleSave = (id) => {
    setSavedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      if (next.includes(id)) db.upsert("rs_saved_startups", { startup_id: id, user_id: me });
      else db.del("rs_saved_startups", `startup_id=eq.${id}&user_id=eq.${me}`);
      return next;
    });
  };

  if (selected) {
    return <StartupDetail startup={selected} me={me} profiles={profiles} bals={bals} dk={dk} onBack={() => { setSelected(null); setInitialTab("overview"); load(); }} addNotif={addNotif} onStartupUpdated={s => setStartups(prev => prev.map(x => x.id === s.id ? s : x))} initialTab={initialTab} myProfile={myProfile} openSubscriptionModal={openSubscriptionModal} />;
  }

  const filtered = startups.filter(s => {
    // Active plan check for other users: Startups created by users without an active plan are hidden from public listings
    const isOwner = s.created_by === me || (s.founders || []).includes(me);
    if (!isOwner) {
      const creatorProfile = profiles ? profiles[s.created_by] : null;
      if (!isPlanActive(creatorProfile)) return false;
    }

    if (savedOnly && !savedIds.includes(s.id)) return false;

    if (selectedCategory !== "All Categories" && s.category !== selectedCategory && s.industry !== selectedCategory) {
      if (!s.description?.toLowerCase().includes(selectedCategory.toLowerCase())) return false;
    }
    if (selectedStage !== "All Stages" && s.stage !== selectedStage) {
      if (!s.description?.toLowerCase().includes(selectedStage.toLowerCase())) return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q);
  });


  const myStartups = startups.filter(s => s.created_by === me || (s.founders || []).includes(me));

  const handleSelectPlan = (plan) => {
    setShowMembership(false);
    setShowCreate(true);
  };

  return (
    <div>
      {showMembership && <MembershipModal dk={dk} onClose={() => setShowMembership(false)} isMobile={isMobile} onSelectPlan={handleSelectPlan} />}
      {showCreate && <CreateStartupModal me={me} dk={dk} onClose={() => setShowCreate(false)} onSave={s => { if (s) setStartups(prev => { const ex = prev.find(x => x.id === s.id); return ex ? prev.map(x => x.id === s.id ? s : x) : [s, ...prev]; }); addNotif?.({ type: "success", msg: "Startup launched! 🚀" }); }} />}
      {showJoinCode && <JoinCodeModal me={me} dk={dk} onClose={() => setShowJoinCode(false)} onJoined={s => { setSelected(s); setInitialTab("pages"); }} isMobile={isMobile} />}

      <div style={{ background: dk ? "linear-gradient(135deg,#1e3a8a22,#5b21b622)" : "linear-gradient(135deg,#dbeafe,#ede9fe)", border: `1px solid ${dk ? "#3b82f630" : "#bfdbfe"}`, borderRadius: 18, padding: "16px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 900, color: th.txt, display: "flex", alignItems: "center", gap: 8 }}>
            <Rocket size={22} color="#3b82f6" /> Colab
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: th.txt2 }}>Startup OS · Discover · Collaborate · Build</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setShowJoinCode(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "8px 14px", color: th.txt2, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Key size={13} color={th.txt2} /> Enter Code
          </button>
          <button onClick={handleCreateStartupClick} style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", border: "none", borderRadius: 10, padding: "8px 16px", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer" }}><PlusCircle size={14} /> Create Startup</button>
        </div>
      </div>

      {/* Active Plan Banner (matching FundingView) */}
      {isSubscribed ? (
        <div style={{
          background: dk ? "rgba(16,185,129,0.06)" : "#f0fdf4",
          border: "1px solid rgba(16,185,129,0.2)",
          borderRadius: 16,
          padding: "12px 18px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12,
          color: th.txt,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={16} color="#10b981" />
            <span>Active Plan: <strong>{subPlan === "growth" ? "Founder Growth (₹1,299/mo - Up to 2 Startups)" : "Founder Starter (₹499/mo - 1 Startup Allowed)"}</strong></span>
          </div>
          {subPlan === "starter" && (
            <button onClick={openSubscriptionModal} style={{ background: "transparent", border: "1px solid #6366f1", color: "#6366f1", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              Upgrade to 10 Startups
            </button>
          )}
        </div>
      ) : (
        myStartups.length > 0 && (
          <div style={{
            background: dk ? "rgba(239, 68, 68, 0.12)" : "#fef2f2",
            border: `1px solid ${dk ? "rgba(239, 68, 68, 0.35)" : "#fca5a5"}`,
            borderRadius: 16,
            padding: "14px 18px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260 }}>
              <ShieldAlert size={22} color="#ef4444" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: dk ? "#fca5a5" : "#991b1b" }}>
                  ⚠️ Your Startups are Delisted &amp; Hidden from Other Users
                </div>
                <div style={{ fontSize: 12, color: dk ? "rgba(255,255,255,0.75)" : "#7f1d1d", marginTop: 2 }}>
                  Your subscription plan is inactive or expired. Other users cannot see your startups or listed products. Upgrade your plan to make them visible again!
                </div>
              </div>
            </div>
            <button
              onClick={openSubscriptionModal}
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "9px 16px",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
                flexShrink: 0
              }}
            >
              <Crown size={14} /> Upgrade to Publish Startups
            </button>
          </div>
        )
      )}

      {myStartups.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: th.txt3, letterSpacing: 0.5, textTransform: "uppercase" }}>
              My Startups {!isSubscribed && <span style={{ color: "#ef4444", textTransform: "none" }}>(Delisted - Inactive Plan)</span>}
            </div>
            {!isSubscribed && (
              <button
                onClick={openSubscriptionModal}
                style={{ background: "transparent", border: "none", color: "#6366f1", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
              >
                Upgrade to Publish All →
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {myStartups.map(s => (
              <button
                key={s.id}
                onClick={() => { setSelected(s); setInitialTab("overview"); }}
                style={{
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: !isSubscribed ? (dk ? "rgba(239,68,68,0.08)" : "#fff5f5") : th.surf2,
                  border: `1px solid ${!isSubscribed ? "rgba(239,68,68,0.3)" : th.bdr}`,
                  borderRadius: 12,
                  padding: "8px 12px",
                  cursor: "pointer"
                }}
              >
                <Logo name={s.name} src={s.logo} size={28} radius={8} fontSize={16} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: th.txt, display: "flex", alignItems: "center", gap: 4 }}>
                    {s.name} {!isSubscribed && <span style={{ fontSize: 10 }} title="Hidden from public">🔒</span>}
                  </div>
                  <div style={{ fontSize: 11, color: !isSubscribed ? "#ef4444" : "#f59e0b", fontWeight: 600 }}>
                    {!isSubscribed ? "Delisted" : s.referral_code}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}


      {/* Search & Filter Bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: th.txt3 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search startups by name or topic…" style={{ width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "9px 12px 9px 34px", fontSize: 13, outline: "none", color: th.txt, boxSizing: "border-box" }} />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          style={{ background: th.surf2, border: `1px solid ${th.bdr}`, color: th.txt, padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600, outline: "none", cursor: "pointer" }}
        >
          {["All Categories", "SaaS", "AI", "Fintech", "Consumer", "Biotech", "E-commerce", "DeepTech", "HealthTech", "Web3", "Marketplace"].map(cat => (
            <option key={cat} value={cat} style={{ background: th.side, color: th.txt }}>{cat}</option>
          ))}
        </select>

        {/* Stage Filter */}
        <select
          value={selectedStage}
          onChange={e => setSelectedStage(e.target.value)}
          style={{ background: th.surf2, border: `1px solid ${th.bdr}`, color: th.txt, padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600, outline: "none", cursor: "pointer" }}
        >
          {["All Stages", "Idea", "MVP", "Seed", "Growth"].map(stg => (
            <option key={stg} value={stg} style={{ background: th.side, color: th.txt }}>{stg}</option>
          ))}
        </select>

        <button onClick={() => setSavedOnly(v => !v)} style={{ background: savedOnly ? "rgba(99,102,241,0.15)" : th.surf2, border: `1px solid ${savedOnly ? "#6366f140" : th.bdr}`, borderRadius: 10, padding: "8px 14px", color: savedOnly ? "#6366f1" : th.txt2, cursor: "pointer", flexShrink: 0, fontSize: 12, fontWeight: 600 }}>🔖 {savedOnly ? "All" : "Saved"}</button>
      </div>


      {loading ? <Spin dk={dk} msg="Loading startups…" /> : filtered.length === 0 ? (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 60,
          background: th.surf,
          backdropFilter: th.blur,
          WebkitBackdropFilter: th.blur,
          border: `1px solid ${th.bdr}`,
          borderRadius: 24,
          textAlign: "center",
          gap: 12
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: dk ? "rgba(99, 102, 241, 0.1)" : "rgba(99, 102, 241, 0.05)",
            border: `1px solid ${dk ? "rgba(99, 102, 241, 0.2)" : "rgba(99, 102, 241, 0.1)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: dk ? "0 0 20px rgba(99, 102, 241, 0.15)" : "0 0 20px rgba(99, 102, 241, 0.05)",
            marginBottom: 6
          }}>
            <Rocket size={28} color="#6366f1" />
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: th.txt }}>{savedOnly ? "No saved startups" : "No startups yet"}</p>
          <p style={{ fontSize: 14, margin: 0, color: th.txt2 }}>{savedOnly ? "Save startups to see them here" : "Be the first to create one!"}</p>
          {!savedOnly && <button onClick={() => setShowCreate(true)} style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", border: "none", borderRadius: 12, padding: "10px 24px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>Create Startup</button>}
        </div>
      ) : filtered.map((s, i) => {
        const isOwner = s.created_by === me || (s.founders || []).includes(me);
        const founders = (s.founders || [s.created_by]).filter(Boolean);
        const latestUpd = latestUpdates[s.id];
        const isSaved = savedIds.includes(s.id);
        return (
          <div key={s.id} style={{ animation: `fadeUp 0.42s cubic-bezier(0.22,1,0.36,1) ${Math.min(i * 55, 440)}ms both` }}>
            <Card dk={dk} anim={false}>
              <div onClick={() => { setSelected(s); setInitialTab("overview"); }} style={{ cursor: "pointer" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 12 }}>
                  <Logo name={s.name} src={s.logo} size={56} radius={16} fontSize={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: th.txt }}>{s.name}</div>
                      <div style={{ display: "flex", gap: 5, flexShrink: 0, flexWrap: "wrap", alignItems: "center" }}>
                        {isSaved && <span style={{ fontSize: 12, color: "#6366f1" }}>🔖</span>}
                        {isOwner && <span style={{ background: "#f59e0b18", color: "#f59e0b", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, border: "1px solid #f59e0b40" }}>OWNER</span>}
                        {isOwner && !isSubscribed && (
                          <span style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 99, border: "1px solid rgba(239,68,68,0.4)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                            🔒 DELISTED FROM PUBLIC
                          </span>
                        )}
                      </div>
                    </div>
                    <p style={{ margin: "0 0 8px", fontSize: 13, color: th.txt2, lineHeight: 1.55 }}>{s.description?.slice(0, 120)}{s.description?.length > 120 ? "…" : ""}</p>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                      {s.website && <a href={s.website} onClick={e => e.stopPropagation()} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 3, background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 6, padding: "2px 7px", fontSize: 11, color: th.txt2, fontWeight: 600, textDecoration: "none" }}><Globe size={10} /> Web</a>}
                      {s.github_link && <a href={s.github_link} onClick={e => e.stopPropagation()} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 3, background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 6, padding: "2px 7px", fontSize: 11, color: th.txt2, fontWeight: 600, textDecoration: "none" }}><Github size={10} /> Git</a>}
                      {s.social_links?.twitter && <a href={s.social_links.twitter} onClick={e => e.stopPropagation()} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", background: "#1da1f215", border: "1px solid #1da1f230", borderRadius: 6, padding: "2px 7px", fontSize: 11, color: "#1da1f2", textDecoration: "none" }}><Twitter size={10} /></a>}
                      {s.social_links?.linkedin && <a href={s.social_links.linkedin} onClick={e => e.stopPropagation()} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", background: "#0a66c215", border: "1px solid #0a66c230", borderRadius: 6, padding: "2px 7px", fontSize: 11, color: "#0a66c2", textDecoration: "none" }}><Linkedin size={10} /></a>}
                    </div>
                    {founders.length > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ display: "flex" }}>{founders.slice(0, 4).map((uid, fi) => <div key={uid} style={{ marginLeft: fi > 0 ? -8 : 0, width: 22, height: 22, borderRadius: "50%", border: `2px solid ${th.surf}`, overflow: "hidden" }}><Av profile={profiles[uid] || {}} size={22} /></div>)}</div>
                        <span style={{ fontSize: 11, color: th.txt3 }}>{founders.length} founder{founders.length !== 1 ? "s" : ""}</span>
                      </div>
                    )}
                  </div>
                </div>
                {latestUpd && (
                  <div style={{ background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "8px 12px", marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: th.txt3, marginBottom: 2 }}>📢 LATEST UPDATE</div>
                    <div style={{ fontSize: 12, color: th.txt2, lineHeight: 1.5 }}>{latestUpd.content?.slice(0, 130)}{latestUpd.content?.length > 130 ? "…" : ""}</div>
                  </div>
                )}
                {isOwner && !isSubscribed && (
                  <div style={{
                    background: dk ? "rgba(239, 68, 68, 0.12)" : "#fef2f2",
                    border: `1px solid ${dk ? "rgba(239, 68, 68, 0.3)" : "#fca5a5"}`,
                    borderRadius: 10,
                    padding: "8px 12px",
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap"
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: dk ? "#fca5a5" : "#991b1b", display: "flex", alignItems: "center", gap: 5 }}>
                      <ShieldAlert size={14} color="#ef4444" /> Delisted: Hidden from other users until plan upgrade
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); openSubscriptionModal?.(); }}
                      style={{
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                      }}
                    >
                      <Crown size={12} /> Upgrade to Publish
                    </button>
                  </div>
                )}
              </div>
              <div style={{ borderTop: `1px solid ${th.bdr}`, marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: th.txt3 }}>{s.created_at ? ago(new Date(s.created_at).getTime()) + " ago" : ""}</span>
                  <button onClick={e => { e.stopPropagation(); toggleSave(s.id); }} style={{ background: isSaved ? "rgba(99,102,241,0.1)" : "none", border: isSaved ? "1px solid #6366f140" : "none", borderRadius: 6, padding: "3px 6px", cursor: "pointer", color: isSaved ? "#6366f1" : th.txt3, fontSize: 10, display: "flex", alignItems: "center" }}><Bookmark/></button>
                </div>
                <button onClick={() => { setSelected(s); setInitialTab(isOwner ? "overview" : "pages"); }} style={{ display: "flex", alignItems: "center", gap: 5, background: isOwner ? "linear-gradient(135deg,#3b82f6,#6366f1)" : "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 10, padding: "7px 18px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }} data-testid={`button-open-${s.id}`}>
                  {isOwner ? "Manage" : "Join"} <ChevronRight size={13} />
                </button>
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
