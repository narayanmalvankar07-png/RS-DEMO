import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { PlusCircle, Search, Bookmark, ArrowLeft, Globe, Github, Twitter, Linkedin, Copy, Check, X, Send, Users, FileText, Bell, BarChart3, Edit2, Trash2, ChevronRight, Lock, MessageSquare, Megaphone } from "lucide-react";
import { T } from "../config/constants.js";
import { db } from "../services/supabase.js";
import { ago } from "../utils/helpers.js";
import Card from "../components/ui/Card.jsx";
import Av from "../components/ui/Av.jsx";
import Spin from "../components/ui/Spin.jsx";

// ─── Logo renderer ────────────────────────────────────────────────
function Logo({ src, size = 56, radius = 16, fontSize = 28 }) {
  const isImg = src && (src.startsWith("data:") || src.startsWith("http"));
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize, flexShrink: 0, overflow: "hidden" }}>
      {isImg ? <img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="logo" /> : (src || "🚀")}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────
const genRefCode = name =>
  name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase() +
  "-" + Math.random().toString(36).slice(2, 6).toUpperCase();

const PAGE_TYPES = [
  { id: "community",  label: "Community",  desc: "Public audience — announcements, community engagement",        c: "#3b82f6", e: "🌐" },
  { id: "product",    label: "Product",    desc: "Product updates & roadmap",                                    c: "#10b981", e: "🚀" },
  { id: "tech",       label: "Tech",       desc: "Engineers — dev logs, architecture, code discussions",         c: "#8b5cf6", e: "🤖" },
  { id: "investment", label: "Investment", desc: "Investors & advisors — pitch decks, funding updates, traction",c: "#f59e0b", e: "💰" },
  { id: "marketing",  label: "Marketing",  desc: "Growth team — campaigns, content strategy, analytics",         c: "#ec4899", e: "📣" },
  { id: "sales",      label: "Sales",      desc: "Sales team — deals, pipeline, customer outreach",              c: "#06b6d4", e: "🤝" },
];

const JOIN_ROLES = [
  { id: "developer",  label: "Developer",  e: "⚡", c: "#3b82f6" },
  { id: "designer",   label: "Designer",   e: "🎨", c: "#ec4899" },
  { id: "marketer",   label: "Marketer",   e: "📢", c: "#f97316" },
  { id: "investor",   label: "Investor",   e: "💰", c: "#10b981" },
  { id: "advisor",    label: "Advisor",    e: "🎯", c: "#8b5cf6" },
  { id: "cofounder",  label: "Co-Founder", e: "🚀", c: "#ef4444" },
];

function CopyBtn({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} style={{ display: "flex", alignItems: "center", gap: 5, background: copied ? "#10b98118" : "rgba(255,255,255,0.07)", border: `1px solid ${copied ? "#10b98140" : "rgba(255,255,255,0.12)"}`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: copied ? "#10b981" : "#94a3b8", fontSize: 12, fontWeight: 600 }}>
      {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? "Copied!" : label}
    </button>
  );
}

// ─── Create / Edit Startup Modal ──────────────────────────────────
function CreateStartupModal({ me, existing, onClose, onSave, dk }) {
  const th = T(dk);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: existing?.name || "",
    logo: existing?.logo || "🚀",
    description: existing?.description || "",
    website: existing?.website || "",
    github_link: existing?.github_link || "",
    twitter: existing?.social_links?.twitter || "",
    linkedin: existing?.social_links?.linkedin || "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name.trim() && form.description.trim();
  const EMOJIS = ["🚀","💡","⚡","🎯","💰","🌍","🔥","🤝","📊","🎨","🛠️","🧠","💎","🌱","🔬","📱"];

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      logo: form.logo,
      description: form.description.trim(),
      website: form.website.trim(),
      github_link: form.github_link.trim(),
      social_links: { twitter: form.twitter.trim(), linkedin: form.linkedin.trim() },
      created_by: me,
      founders: existing?.founders || [me],
      referral_code: existing?.referral_code || genRefCode(form.name),
    };
    let result;
    if (existing?.id) {
      await db.patch("rs_startups", `id=eq.${existing.id}`, payload);
      result = { ...existing, ...payload };
    } else {
      result = await db.post("rs_startups", payload);
      if (result?.id) {
        const defaultPages = ["community", "product"].map(tid => {
          const pt = PAGE_TYPES.find(p => p.id === tid);
          return { startup_id: result.id, name: pt.label, description: pt.desc, type_id: tid };
        });
        await db.postMany("rs_startup_pages", defaultPages);
      }
    }
    setSaving(false);
    onSave(result);
    onClose();
  };

  const inp = { width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box", color: th.txt, fontFamily: "inherit" };

  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: dk ? "rgba(13,20,38,0.97)" : "rgba(255,255,255,0.97)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: `1px solid ${th.bdr}`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 460, animation: "fadeUp 0.25s ease both", margin: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: th.txt }}>{existing ? "Edit Startup" : `Create Startup — Step ${step}/2`}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3, display: "flex" }}><X size={18} /></button>
        </div>
        {!existing && (
          <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
            {[1, 2].map(s => <div key={s} style={{ flex: 1, height: 3, borderRadius: 99, background: s <= step ? "#3b82f6" : th.bdr, transition: "all 0.3s" }} />)}
          </div>
        )}
        {step === 1 && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 4 }}>Logo Emoji</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, background: th.surf2, borderRadius: 10, padding: 10, border: `1px solid ${th.bdr}` }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => set("logo", e)} style={{ fontSize: 20, background: form.logo === e ? "#3b82f618" : "none", border: form.logo === e ? "2px solid #3b82f6" : "2px solid transparent", borderRadius: 8, width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{e}</button>
                ))}
              </div>
              <div style={{ margin: "10px auto 0", width: "fit-content" }}><Logo src={form.logo} size={56} radius={14} fontSize={28} /></div>
            </div>
            {[{ k: "name", l: "Startup Name *", p: "e.g. SkillSwap" }, { k: "description", l: "Description *", p: "What are you building and why?", rows: 4 }].map(({ k, l, p, rows }) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 4 }}>{l}</label>
                {rows ? <textarea value={form[k]} onChange={e => set(k, e.target.value)} placeholder={p} rows={rows} style={{ ...inp, resize: "vertical" }} /> : <input value={form[k]} onChange={e => set(k, e.target.value)} placeholder={p} style={inp} />}
              </div>
            ))}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "10px", background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 12, cursor: "pointer", color: th.txt2, fontWeight: 600 }}>Cancel</button>
              <button onClick={() => existing ? save() : setStep(2)} disabled={!valid} style={{ flex: 2, padding: "10px", background: valid ? "#3b82f6" : th.surf2, border: "none", borderRadius: 12, cursor: valid ? "pointer" : "default", color: valid ? "#fff" : th.txt3, fontWeight: 700, fontSize: 14 }}>
                {existing ? (saving ? "Saving…" : "Save Changes") : "Next: Links →"}
              </button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            {[{ k: "website", l: "Website", p: "https://…" }, { k: "github_link", l: "GitHub", p: "https://github.com/…" }, { k: "twitter", l: "Twitter / X", p: "https://twitter.com/…" }, { k: "linkedin", l: "LinkedIn", p: "https://linkedin.com/company/…" }].map(({ k, l, p }) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 4 }}>{l}</label>
                <input value={form[k]} onChange={e => set(k, e.target.value)} placeholder={p} style={inp} />
              </div>
            ))}
            <div style={{ background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 12, padding: 12, marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: th.txt, marginBottom: 6 }}>📄 Auto-created Pages:</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {["community", "product"].map(tid => { const pt = PAGE_TYPES.find(p => p.id === tid); return pt ? <span key={tid} style={{ background: `${pt.c}18`, color: pt.c, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99 }}>{pt.e} {pt.label}</span> : null; })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: "10px", background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 12, cursor: "pointer", color: th.txt2, fontWeight: 600 }}>← Back</button>
              <button onClick={save} disabled={saving} style={{ flex: 2, padding: "10px", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", border: "none", borderRadius: 12, cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 14 }}>{saving ? "Launching…" : "Launch Startup 🚀"}</button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.getElementById("portal-root")
  );
}

// ─── Join via Referral Code Modal ─────────────────────────────────
function JoinCodeModal({ me, onClose, onJoined, dk }) {
  const th = T(dk);
  const [code, setCode] = useState("");
  const [startup, setStartup] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("code");
  const [roles, setRoles] = useState([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const check = async () => {
    if (!code.trim()) return;
    setChecking(true); setError(""); setStartup(null);
    const res = await db.get("rs_startups", `referral_code=eq.${code.trim().toUpperCase()}`);
    if (!res?.length) { setError("Invalid code. Check and try again."); }
    else setStartup(res[0]);
    setChecking(false);
  };

  const submit = async () => {
    if (!roles.length) return;
    setSubmitting(true);
    await db.post("rs_page_access_requests", { startup_id: startup.id, user_id: me, selected_roles: roles, message: message.trim(), status: "pending" });
    setSubmitting(false);
    onJoined(startup);
    onClose();
  };

  const inp = { background: th.inp, border: `1.5px solid ${error ? "#ef4444" : startup ? "#10b981" : th.inpB}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, outline: "none", color: th.txt, fontFamily: "monospace", letterSpacing: 1 };

  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: dk ? "rgba(13,20,38,0.97)" : "rgba(255,255,255,0.97)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: `1px solid ${th.bdr}`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 380, animation: "fadeUp 0.25s ease both" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: th.txt }}>{step === "code" ? "Join via Code" : "Select Your Role"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3, display: "flex" }}><X size={18} /></button>
        </div>
        {step === "code" ? (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); setStartup(null); }} onKeyDown={e => e.key === "Enter" && check()} placeholder="e.g. SKILL-A3B2" style={{ ...inp, flex: 1 }} />
              <button onClick={check} disabled={checking || !code.trim()} style={{ background: "#3b82f6", border: "none", borderRadius: 10, padding: "0 16px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{checking ? "…" : "Check"}</button>
            </div>
            {error && <p style={{ fontSize: 13, color: "#ef4444", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 5 }}>✕ {error}</p>}
            {startup && (
              <div style={{ background: th.surf2, borderRadius: 14, padding: 14, marginBottom: 16, border: "1px solid #10b98130" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <Logo src={startup.logo} size={42} radius={11} fontSize={22} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: th.txt }}>{startup.name}</div>
                    <div style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>✓ Valid startup</div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: th.txt2, margin: 0, lineHeight: 1.5 }}>{startup.description?.slice(0, 100)}{startup.description?.length > 100 ? "…" : ""}</p>
              </div>
            )}
            {startup && <button onClick={() => setStep("roles")} style={{ width: "100%", padding: "11px", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Continue to Join →</button>}
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: th.txt2, margin: "0 0 14px" }}>Joining <strong style={{ color: th.txt }}>{startup.name}</strong> — what role(s) do you want to take?</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              {JOIN_ROLES.map(r => {
                const sel = roles.includes(r.id);
                return (
                  <button key={r.id} onClick={() => setRoles(rs => rs.includes(r.id) ? rs.filter(x => x !== r.id) : [...rs, r.id])}
                    style={{ background: sel ? `${r.c}20` : th.surf2, border: `1.5px solid ${sel ? r.c : th.bdr}`, borderRadius: 10, padding: "10px", cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
                    <div style={{ fontSize: 16, marginBottom: 2 }}>{r.e}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: sel ? r.c : th.txt2 }}>{r.label}</div>
                  </button>
                );
              })}
            </div>
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Why do you want to join? (optional)" rows={3} style={{ width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, outline: "none", color: th.txt, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 14 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep("code")} style={{ flex: 1, padding: "10px", background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 12, cursor: "pointer", color: th.txt2, fontWeight: 600 }}>← Back</button>
              <button onClick={submit} disabled={!roles.length || submitting} style={{ flex: 2, padding: "10px", background: roles.length ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : th.surf2, border: "none", borderRadius: 12, cursor: roles.length ? "pointer" : "default", color: roles.length ? "#fff" : th.txt3, fontWeight: 700 }}>{submitting ? "Sending…" : "Send Request"}</button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.getElementById("portal-root")
  );
}

// ─── Non-Founder (Visitor/Member) Detail View ─────────────────────
function VisitorDetail({ startup, me, profiles, dk, onBack, addNotif }) {
  const th = T(dk);
  const [pages, setPages] = useState([]);
  const [members, setMembers] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [myRequest, setMyRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinRoles, setJoinRoles] = useState([]);
  const [joinMsg, setJoinMsg] = useState("");
  const [submittingJoin, setSubmittingJoin] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(true);

  const isApproved = myRequest?.status === "approved";
  const FB_KEY = `rs_fb_${startup.id}`;

  const getLocalFeedbacks = () => {
    try { return JSON.parse(localStorage.getItem(FB_KEY) || "[]"); } catch { return []; }
  };

  const saveLocalFeedback = (fb) => {
    try {
      const existing = getLocalFeedbacks();
      localStorage.setItem(FB_KEY, JSON.stringify([fb, ...existing].slice(0, 200)));
    } catch {}
  };

  useEffect(() => {
    (async () => {
      const [reqs, pgs, mbs, upds, fbs] = await Promise.all([
        db.get("rs_page_access_requests", `startup_id=eq.${startup.id}&user_id=eq.${me}`),
        db.get("rs_startup_pages", `startup_id=eq.${startup.id}&order=created_at.asc`),
        db.get("rs_page_access", `startup_id=eq.${startup.id}&status=eq.approved`),
        db.get("rs_startup_updates", `startup_id=eq.${startup.id}&order=created_at.desc&limit=20`),
        db.get("rs_startup_feedback", `startup_id=eq.${startup.id}&order=created_at.desc`),
      ]);
      setMyRequest(reqs?.[0] || null);
      setPages(pgs || []);
      setMembers([...new Map((mbs || []).map(m => [m.user_id, m])).values()]);
      setUpdates(upds || []);

      // Merge Supabase feedback with localStorage feedback (dedup by id)
      const remoteFbs = fbs || [];
      const localFbs = getLocalFeedbacks();
      const remoteIds = new Set(remoteFbs.map(f => f.id));
      const merged = [...remoteFbs, ...localFbs.filter(f => !remoteIds.has(f.id))];
      merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setFeedbacks(merged);

      setLoading(false);
    })();
  }, [startup.id, me]);

  const submitJoin = async () => {
    if (!joinRoles.length) return;
    setSubmittingJoin(true);
    const saved = await db.post("rs_page_access_requests", { startup_id: startup.id, user_id: me, selected_roles: joinRoles, message: joinMsg.trim(), status: "pending" });
    if (saved) { setMyRequest(saved); addNotif?.({ type: "success", msg: "Join request sent!" }); }
    setSubmittingJoin(false);
    setShowJoinForm(false);
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim()) return;
    setSubmittingFeedback(true);

    // Try Supabase first
    const saved = await db.post("rs_startup_feedback", {
      startup_id: startup.id,
      user_id: me,
      content: feedbackText.trim(),
    });

    if (saved) {
      // Supabase worked — use the real record
      setFeedbacks(f => [saved, ...f]);
    } else {
      // Supabase table doesn't exist yet — store locally
      const localFb = {
        id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        startup_id: startup.id,
        user_id: me,
        content: feedbackText.trim(),
        created_at: new Date().toISOString(),
      };
      saveLocalFeedback(localFb);
      setFeedbacks(f => [localFb, ...f]);
    }

    setFeedbackText("");
    addNotif?.({ type: "success", msg: "Feedback submitted!" });
    setSubmittingFeedback(false);
  };

  const founders = (startup.founders || [startup.created_by]).filter(Boolean);

  // Combine founders + members for the team display
  const teamUids = [...new Set([...founders, ...members.map(m => m.user_id)])];

  const headerBg = dk
    ? "linear-gradient(135deg,rgba(30,58,138,0.25),rgba(91,33,182,0.2))"
    : "linear-gradient(135deg,#e0e7ff,#ede9fe)";
  const headerBorder = dk ? "1px solid rgba(99,102,241,0.2)" : "1px solid #c7d2fe";

  return (
    <div style={{ animation: "fadeUp 0.3s ease both" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", cursor: "pointer", color: th.txt2, fontSize: 13, fontWeight: 600, padding: "0 0 14px" }}>
        <ArrowLeft size={15} /> Back to Colab
      </button>

      {/* ── Header ── */}
      <div style={{ background: headerBg, border: headerBorder, borderRadius: 20, padding: "18px 20px", marginBottom: 16 }}>
        {/* Top row: logo + name + join button */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Logo src={startup.logo} size={64} radius={16} fontSize={32} />
            <div>
              <div style={{ fontWeight: 900, fontSize: 22, color: th.txt, lineHeight: 1.2 }}>{startup.name}</div>
              <div style={{ fontSize: 13, color: th.txt2, marginTop: 3 }}>{startup.description?.slice(0, 80)}{startup.description?.length > 80 ? "…" : ""}</div>
            </div>
          </div>

          {/* Join / Status button */}
          {!myRequest ? (
            <button
              onClick={() => setShowJoinForm(v => !v)}
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 12, padding: "10px 22px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}
              data-testid="button-join-startup"
            >
              Join Startup
            </button>
          ) : (
            <div style={{ flexShrink: 0, padding: "8px 16px", borderRadius: 12, fontWeight: 700, fontSize: 13, background: myRequest.status === "approved" ? "#10b98118" : myRequest.status === "rejected" ? "#ef444418" : "#f59e0b18", color: myRequest.status === "approved" ? "#10b981" : myRequest.status === "rejected" ? "#ef4444" : "#f59e0b", border: `1px solid ${myRequest.status === "approved" ? "#10b98140" : myRequest.status === "rejected" ? "#ef444440" : "#f59e0b40"}` }}>
              {myRequest.status === "approved" ? "✅ Member" : myRequest.status === "rejected" ? "❌ Not approved" : "⏳ Request pending"}
            </div>
          )}
        </div>

        {/* Social links */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: teamUids.length ? 14 : 0 }}>
          {startup.website && (
            <a href={startup.website} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, background: dk ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.7)", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "5px 12px", fontSize: 12, color: th.txt2, fontWeight: 600, textDecoration: "none" }}>
              <Globe size={12} /> Website
            </a>
          )}
          {startup.github_link && (
            <a href={startup.github_link} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, background: dk ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.7)", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "5px 12px", fontSize: 12, color: th.txt2, fontWeight: 600, textDecoration: "none" }}>
              <Github size={12} /> GitHub
            </a>
          )}
          {startup.social_links?.twitter && (
            <a href={startup.social_links.twitter} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#1da1f215", border: "1px solid #1da1f230", borderRadius: 8, padding: "5px 10px", textDecoration: "none" }}>
              <Twitter size={13} color="#1da1f2" />
            </a>
          )}
          {startup.social_links?.linkedin && (
            <a href={startup.social_links.linkedin} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#0a66c215", border: "1px solid #0a66c230", borderRadius: 8, padding: "5px 10px", textDecoration: "none" }}>
              <Linkedin size={13} color="#0a66c2" />
            </a>
          )}
        </div>

        {/* Team row */}
        {teamUids.length > 0 && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {teamUids.slice(0, 6).map(uid => {
              const prof = profiles[uid] || { name: "Member" };
              const isFounderMember = founders.includes(uid);
              return (
                <div key={uid} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Av profile={prof} size={30} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: th.txt, lineHeight: 1.2 }}>{prof.name?.split(" ")[0] || "Member"}</div>
                    <div style={{ fontSize: 10, color: th.txt3 }}>{isFounderMember ? "Founder" : "Member"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Join Role Selector ── */}
      {showJoinForm && !myRequest && (
        <Card dk={dk} anim={false} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: th.txt }}>Select your role(s)</div>
            <button onClick={() => setShowJoinForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3 }}><X size={16} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
            {JOIN_ROLES.map(r => {
              const sel = joinRoles.includes(r.id);
              return (
                <button key={r.id} onClick={() => setJoinRoles(rs => rs.includes(r.id) ? rs.filter(x => x !== r.id) : [...rs, r.id])}
                  style={{ background: sel ? `${r.c}20` : th.surf2, border: `1.5px solid ${sel ? r.c : th.bdr}`, borderRadius: 10, padding: "10px 8px", cursor: "pointer", textAlign: "center", transition: "all 0.2s" }}>
                  <div style={{ fontSize: 18, marginBottom: 3 }}>{r.e}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: sel ? r.c : th.txt2 }}>{r.label}</div>
                </button>
              );
            })}
          </div>
          <textarea value={joinMsg} onChange={e => setJoinMsg(e.target.value)} placeholder="Why do you want to join? (optional)" rows={2} style={{ width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, outline: "none", color: th.txt, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 10 }} />
          <button onClick={submitJoin} disabled={!joinRoles.length || submittingJoin} style={{ width: "100%", padding: "10px", background: joinRoles.length ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : th.surf2, border: "none", borderRadius: 10, cursor: joinRoles.length ? "pointer" : "default", color: joinRoles.length ? "#fff" : th.txt3, fontWeight: 700, fontSize: 14 }}>
            {submittingJoin ? "Sending…" : "Send Request"}
          </button>
        </Card>
      )}

      {loading ? <Spin dk={dk} msg="Loading…" /> : (
        <>
          {/* ── Pages Section ── */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <FileText size={16} color={th.txt2} />
              <span style={{ fontSize: 16, fontWeight: 800, color: th.txt }}>Pages</span>
            </div>

            {pages.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: th.txt3, fontSize: 13 }}>No pages added yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pages.map(pg => {
                  const pt = PAGE_TYPES.find(p => p.id === pg.type_id) || PAGE_TYPES[0];
                  const unlocked = isApproved;
                  return (
                    <div key={pg.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 14, padding: "14px 16px", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${pt.c}18`, border: `1px solid ${pt.c}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                          {pt.e}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: th.txt, marginBottom: 2 }}>{pg.name}</div>
                          <div style={{ fontSize: 12, color: th.txt3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pg.description || pt.desc}</div>
                        </div>
                      </div>
                      {!unlocked && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, color: th.txt3, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                          <Lock size={13} />
                          <span>Locked</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Request access button */}
            {!isApproved && (
              <button
                onClick={() => { if (!myRequest) setShowJoinForm(true); }}
                style={{ width: "100%", marginTop: 10, padding: "12px", background: "transparent", border: `1.5px dashed ${th.bdr}`, borderRadius: 14, cursor: myRequest ? "default" : "pointer", color: myRequest ? th.txt3 : "#6366f1", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                data-testid="button-request-access"
              >
                <PlusCircle size={14} />
                {myRequest ? "Access request pending…" : "+ Request access to more pages"}
              </button>
            )}
          </div>

          {/* ── Updates Section ── */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Megaphone size={16} color={th.txt2} />
              <span style={{ fontSize: 16, fontWeight: 800, color: th.txt }}>Updates</span>
            </div>

            {updates.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: th.txt3, fontSize: 13 }}>No updates posted yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {updates.map(u => {
                  const prof = profiles[u.created_by] || { name: "Founder" };
                  return (
                    <div key={u.id} style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 14, padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <Av profile={prof} size={36} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: th.txt }}>{prof.name?.split(" ")[0] || "Founder"}</span>
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
          </div>

          {/* ── Feedback Section ── */}
          {feedbackVisible && (
            <div style={{ marginBottom: 24 }}>
              {/* Card */}
              <div style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 16, overflow: "hidden" }}>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${th.bdr}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <MessageSquare size={16} color={th.txt2} />
                    <span style={{ fontSize: 15, fontWeight: 700, color: th.txt }}>
                      Feedback{feedbacks.length > 0 ? ` (${feedbacks.length})` : ""}
                    </span>
                  </div>
                  <button
                    onClick={() => setFeedbackVisible(false)}
                    style={{ width: 26, height: 26, borderRadius: "50%", background: dk ? "rgba(255,255,255,0.07)" : "#f1f5f9", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: th.txt3 }}
                    data-testid="button-close-feedback"
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* Inline input row */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${th.bdr}` }}>
                  <Av profile={profiles[me] || { name: "Me" }} size={34} />
                  <input
                    value={feedbackText}
                    onChange={e => setFeedbackText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && feedbackText.trim()) { e.preventDefault(); submitFeedback(); } }}
                    placeholder="Share your feedback..."
                    style={{ flex: 1, background: dk ? "rgba(255,255,255,0.06)" : "#f8fafc", border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "9px 14px", fontSize: 13, outline: "none", color: th.txt, fontFamily: "inherit" }}
                    data-testid="input-feedback"
                  />
                  <button
                    onClick={submitFeedback}
                    disabled={!feedbackText.trim() || submittingFeedback}
                    style={{ flexShrink: 0, background: feedbackText.trim() ? "#6366f1" : dk ? "rgba(255,255,255,0.07)" : "#f1f5f9", border: "none", borderRadius: 10, padding: "9px 16px", color: feedbackText.trim() ? "#fff" : th.txt3, fontWeight: 700, fontSize: 13, cursor: feedbackText.trim() ? "pointer" : "default", transition: "all 0.2s" }}
                    data-testid="button-send-feedback"
                  >
                    {submittingFeedback ? "…" : "Send"}
                  </button>
                </div>

                {/* Feedback list */}
                {feedbacks.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px 16px", color: th.txt3, fontSize: 13 }}>
                    No feedback yet — be the first!
                  </div>
                ) : (
                  <div style={{ padding: "4px 0" }}>
                    {feedbacks.map((fb, idx) => {
                      const prof = profiles[fb.user_id] || { name: "User" };
                      return (
                        <div key={fb.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 16px", borderTop: idx === 0 ? "none" : `1px solid ${th.bdr}` }}>
                          <Av profile={prof} size={34} />
                          <div style={{ flex: 1, minWidth: 0 }}>
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
          )}

          {/* Re-show feedback button when closed */}
          {!feedbackVisible && (
            <button
              onClick={() => setFeedbackVisible(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "8px 14px", color: th.txt3, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 24 }}
            >
              <MessageSquare size={14} /> Show Feedback
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Founder Dashboard ────────────────────────────────────────────
function FounderDetail({ startup: initialStartup, me, profiles, bals, dk, onBack, addNotif, onStartupUpdated }) {
  const th = T(dk);
  const [startup, setStartup] = useState(initialStartup);
  const [tab, setTab] = useState("overview");
  const [requests, setRequests] = useState([]);
  const [pages, setPages] = useState([]);
  const [members, setMembers] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [updateText, setUpdateText] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddPage, setShowAddPage] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPageType, setNewPageType] = useState("community");

  const load = useCallback(async () => {
    const [reqs, pgs, mbs, upds] = await Promise.all([
      db.get("rs_page_access_requests", `startup_id=eq.${startup.id}&order=created_at.desc`),
      db.get("rs_startup_pages", `startup_id=eq.${startup.id}&order=created_at.asc`),
      db.get("rs_page_access", `startup_id=eq.${startup.id}&status=eq.approved`),
      db.get("rs_startup_updates", `startup_id=eq.${startup.id}&order=created_at.desc&limit=20`),
    ]);
    setRequests(reqs || []);
    setPages(pgs || []);
    setMembers([...new Map((mbs || []).map(m => [m.user_id, m])).values()]);
    setUpdates(upds || []);
    setLoading(false);
  }, [startup.id]);

  useEffect(() => { load(); }, [load]);

  const approveRequest = async (req) => {
    await db.patch("rs_page_access_requests", `id=eq.${req.id}`, { status: "approved" });
    await db.upsert("rs_page_access", { startup_id: startup.id, user_id: req.user_id, status: "approved" });
    setRequests(rs => rs.map(r => r.id === req.id ? { ...r, status: "approved" } : r));
    setMembers(ms => { const exists = ms.find(m => m.user_id === req.user_id); return exists ? ms : [...ms, { user_id: req.user_id, status: "approved" }]; });
  };

  const rejectRequest = async (req) => {
    await db.patch("rs_page_access_requests", `id=eq.${req.id}`, { status: "rejected" });
    setRequests(rs => rs.map(r => r.id === req.id ? { ...r, status: "rejected" } : r));
  };

  const removeMember = async (userId) => {
    if (!window.confirm("Remove this member?")) return;
    await db.del("rs_page_access", `startup_id=eq.${startup.id}&user_id=eq.${userId}`);
    setMembers(ms => ms.filter(m => m.user_id !== userId));
  };

  const postUpdate = async () => {
    if (!updateText.trim()) return;
    setPosting(true);
    const saved = await db.post("rs_startup_updates", { startup_id: startup.id, content: updateText.trim(), created_by: me });
    if (saved) setUpdates(us => [saved, ...us]);
    setUpdateText("");
    setPosting(false);
    addNotif?.({ type: "success", msg: "Update posted!" });
  };

  const addPage = async () => {
    if (!newPageName.trim()) return;
    const pt = PAGE_TYPES.find(p => p.id === newPageType) || PAGE_TYPES[0];
    const saved = await db.post("rs_startup_pages", { startup_id: startup.id, name: newPageName.trim(), description: pt.desc, type_id: newPageType });
    if (saved) setPages(ps => [...ps, saved]);
    setNewPageName(""); setShowAddPage(false);
  };

  const deletePage = async (id) => {
    if (!window.confirm("Delete this page?")) return;
    await db.del("rs_startup_pages", `id=eq.${id}`);
    setPages(ps => ps.filter(p => p.id !== id));
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "requests", label: `Requests${pendingCount ? ` (${pendingCount})` : ""}` },
    { id: "pages", label: "Pages" },
    { id: "members", label: "Members" },
    { id: "updates", label: "Updates" },
  ];

  const inp = { width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box", color: th.txt, fontFamily: "inherit" };

  return (
    <div style={{ animation: "fadeUp 0.3s ease both" }}>
      {showEdit && <CreateStartupModal me={me} existing={startup} onClose={() => setShowEdit(false)} onSave={s => { setStartup(s); onStartupUpdated?.(s); }} dk={dk} />}

      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", cursor: "pointer", color: th.txt2, fontSize: 13, fontWeight: 600, padding: "0 0 14px" }}>
        <ArrowLeft size={15} /> Back to Colab
      </button>

      {/* Header */}
      <div style={{ background: dk ? "linear-gradient(135deg,#1e3a8a22,#5b21b622)" : "linear-gradient(135deg,#dbeafe,#ede9fe)", border: `1px solid ${dk ? "#3b82f630" : "#bfdbfe"}`, borderRadius: 18, padding: 18, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Logo src={startup.logo} size={60} radius={16} fontSize={30} />
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
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: th.surf2, borderRadius: 12, padding: 4, border: `1px solid ${th.bdr}`, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 9, border: "none", background: tab === t.id ? "#3b82f6" : "transparent", color: tab === t.id ? "#fff" : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }}>{t.label}</button>
        ))}
      </div>

      {loading ? <Spin dk={dk} msg="Loading…" /> : (
        <>
          {tab === "overview" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
                {[{ l: "Members", v: members.length, c: "#3b82f6", e: "👥" }, { l: "Pages", v: pages.length, c: "#8b5cf6", e: "📄" }, { l: "Pending", v: pendingCount, c: "#f59e0b", e: "📬" }].map(s => (
                  <div key={s.l} style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 14, padding: "14px 16px" }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{s.e}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: 11, color: th.txt3 }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <Card dk={dk} anim={false}>
                <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: th.txt }}>About</h4>
                <p style={{ margin: "0 0 12px", fontSize: 14, color: th.txt2, lineHeight: 1.6 }}>{startup.description}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
              {requests.length === 0 ? (
                <div style={{ textAlign: "center", padding: 48, color: th.txt3 }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📬</div>
                  <p style={{ fontSize: 14 }}>No join requests yet.</p>
                </div>
              ) : requests.map(req => {
                const prof = profiles[req.user_id] || { name: "Applicant" };
                const reqRoles = req.selected_roles || [];
                return (
                  <Card dk={dk} key={req.id} anim={false}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <Av profile={prof} size={44} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: th.txt }}>{prof.name}</div>
                            <div style={{ fontSize: 12, color: th.txt3 }}>@{prof.handle || req.user_id.slice(0, 8)}</div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: req.status === "approved" ? "#10b98118" : req.status === "rejected" ? "#ef444418" : "#f59e0b18", color: req.status === "approved" ? "#10b981" : req.status === "rejected" ? "#ef4444" : "#f59e0b" }}>{req.status?.toUpperCase()}</span>
                        </div>
                        {reqRoles.length > 0 && (
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
                            {reqRoles.map(rid => { const r = JOIN_ROLES.find(x => x.id === rid); return r ? <span key={rid} style={{ background: `${r.c}18`, color: r.c, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99 }}>{r.e} {r.label}</span> : null; })}
                          </div>
                        )}
                        {req.message && <p style={{ fontSize: 12, color: th.txt2, margin: "0 0 8px", fontStyle: "italic" }}>"{req.message}"</p>}
                        {req.status === "pending" && (
                          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                            <button onClick={() => approveRequest(req)} style={{ display: "flex", alignItems: "center", gap: 5, background: "#10b98118", border: "1px solid #10b98140", borderRadius: 8, padding: "6px 14px", cursor: "pointer", color: "#10b981", fontSize: 12, fontWeight: 700 }}>✓ Approve</button>
                            <button onClick={() => rejectRequest(req)} style={{ display: "flex", alignItems: "center", gap: 5, background: "#ef444418", border: "1px solid #ef444440", borderRadius: 8, padding: "6px 14px", cursor: "pointer", color: "#ef4444", fontSize: 12, fontWeight: 700 }}>✕ Reject</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {tab === "pages" && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <button onClick={() => setShowAddPage(v => !v)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#3b82f6", border: "none", borderRadius: 10, padding: "8px 14px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}><PlusCircle size={14} /> Add Page</button>
              </div>
              {showAddPage && (
                <Card dk={dk} anim={false} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <input value={newPageName} onChange={e => setNewPageName(e.target.value)} placeholder="Page name" style={{ ...inp, flex: 1 }} />
                    <select value={newPageType} onChange={e => setNewPageType(e.target.value)} style={{ background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, color: th.txt, outline: "none" }}>
                      {PAGE_TYPES.map(pt => <option key={pt.id} value={pt.id}>{pt.e} {pt.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setShowAddPage(false)} style={{ flex: 1, padding: "8px", background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 10, cursor: "pointer", color: th.txt2, fontWeight: 600 }}>Cancel</button>
                    <button onClick={addPage} disabled={!newPageName.trim()} style={{ flex: 2, padding: "8px", background: "#3b82f6", border: "none", borderRadius: 10, cursor: "pointer", color: "#fff", fontWeight: 700 }}>Create Page</button>
                  </div>
                </Card>
              )}
              {pages.length === 0
                ? <div style={{ textAlign: "center", padding: 40, color: th.txt3 }}><div style={{ fontSize: 32 }}>📄</div><p>No pages yet.</p></div>
                : pages.map(pg => {
                  const pt = PAGE_TYPES.find(p => p.id === pg.type_id) || PAGE_TYPES[0];
                  return (
                    <Card dk={dk} key={pg.id} anim={false}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: `${pt.c}18`, border: `1px solid ${pt.c}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{pt.e}</div>
                          <div>
                            <div style={{ fontWeight: 700, color: th.txt, fontSize: 14 }}>{pg.name}</div>
                            <div style={{ fontSize: 12, color: th.txt3 }}>{pg.description}</div>
                          </div>
                        </div>
                        <button onClick={() => deletePage(pg.id)} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3, display: "flex", padding: 6 }}><Trash2 size={14} /></button>
                      </div>
                    </Card>
                  );
                })}
            </div>
          )}

          {tab === "members" && (
            <div>
              {members.length === 0
                ? <div style={{ textAlign: "center", padding: 48, color: th.txt3 }}><div style={{ fontSize: 36 }}>👥</div><p>No members yet. Share your referral code to get started.</p></div>
                : members.map(m => {
                  const prof = profiles[m.user_id] || { name: "Member" };
                  const isFounderMember = (startup.founders || [startup.created_by]).includes(m.user_id);
                  return (
                    <Card dk={dk} key={m.user_id} anim={false}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <Av profile={prof} size={42} bal={bals[m.user_id] ?? 0} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, color: th.txt, fontSize: 14 }}>{prof.name}</div>
                          <div style={{ fontSize: 12, color: th.txt3 }}>@{prof.handle || m.user_id.slice(0, 8)}</div>
                        </div>
                        {isFounderMember && <span style={{ background: "#f59e0b18", color: "#f59e0b", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, border: "1px solid #f59e0b30" }}>FOUNDER</span>}
                        {!isFounderMember && m.user_id !== me && (
                          <button onClick={() => removeMember(m.user_id)} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3, display: "flex", padding: 6 }}><X size={14} /></button>
                        )}
                      </div>
                    </Card>
                  );
                })}
            </div>
          )}

          {tab === "updates" && (
            <div>
              <Card dk={dk} anim={false} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: th.txt, fontSize: 14, marginBottom: 10 }}>📢 Post an Update</div>
                <textarea value={updateText} onChange={e => setUpdateText(e.target.value)} placeholder="Share what's new with your startup…" rows={3} style={{ width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, outline: "none", color: th.txt, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 10 }} />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={postUpdate} disabled={!updateText.trim() || posting} style={{ display: "flex", alignItems: "center", gap: 6, background: updateText.trim() ? "#3b82f6" : th.surf2, border: "none", borderRadius: 10, padding: "8px 16px", color: updateText.trim() ? "#fff" : th.txt3, fontWeight: 700, fontSize: 13, cursor: updateText.trim() ? "pointer" : "default" }}><Send size={13} />{posting ? "Posting…" : "Post Update"}</button>
                </div>
              </Card>
              {updates.length === 0
                ? <div style={{ textAlign: "center", padding: 40, color: th.txt3 }}><div style={{ fontSize: 32 }}>📢</div><p>No updates posted yet.</p></div>
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
        </>
      )}
    </div>
  );

  function deleteUpdate(id) {
    db.del("rs_startup_updates", `id=eq.${id}`);
    setUpdates(us => us.filter(u => u.id !== id));
  }
}

// ─── StartupDetail dispatcher ──────────────────────────────────────
function StartupDetail({ startup, me, profiles, bals, dk, onBack, addNotif, onStartupUpdated }) {
  const isFounder = startup.created_by === me || (startup.founders || []).includes(me);
  if (isFounder) {
    return <FounderDetail startup={startup} me={me} profiles={profiles} bals={bals} dk={dk} onBack={onBack} addNotif={addNotif} onStartupUpdated={onStartupUpdated} />;
  }
  return <VisitorDetail startup={startup} me={me} profiles={profiles} dk={dk} onBack={onBack} addNotif={addNotif} />;
}

// ─── Main ColabView ────────────────────────────────────────────────
export default function ColabView({ me, dk, profiles, bals, onProfile, addNotif }) {
  const th = T(dk);
  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [savedIds, setSavedIds] = useState(() => { try { return JSON.parse(localStorage.getItem("rs_saved_startups") || "[]"); } catch { return []; } });
  const [savedOnly, setSavedOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [latestUpdates, setLatestUpdates] = useState({});

  const load = useCallback(async () => {
    const rows = await db.get("rs_startups", "order=created_at.desc");
    setStartups(rows || []);
    if (rows?.length) {
      const ids = rows.map(s => s.id);
      const upds = await db.get("rs_startup_updates", `startup_id=in.(${ids.join(",")})&order=created_at.desc`);
      const map = {};
      (upds || []).forEach(u => { if (!map[u.startup_id]) map[u.startup_id] = u; });
      setLatestUpdates(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleSave = (id) => {
    setSavedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem("rs_saved_startups", JSON.stringify(next));
      return next;
    });
  };

  const handleCreated = (s) => {
    if (s) { setStartups(prev => { const exists = prev.find(x => x.id === s.id); return exists ? prev.map(x => x.id === s.id ? s : x) : [s, ...prev]; }); }
    addNotif?.({ type: "success", msg: s?.id ? "Startup launched! 🚀" : "Startup updated!" });
  };

  const handleJoined = (s) => {
    addNotif?.({ type: "success", msg: `Join request sent to ${s.name}!` });
  };

  if (selected) {
    return <StartupDetail startup={selected} me={me} profiles={profiles} bals={bals} dk={dk} onBack={() => { setSelected(null); load(); }} addNotif={addNotif} onStartupUpdated={s => setStartups(prev => prev.map(x => x.id === s.id ? s : x))} />;
  }

  const filtered = startups.filter(s => {
    if (savedOnly && !savedIds.includes(s.id)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q);
  });

  const myStartups = startups.filter(s => s.created_by === me || (s.founders || []).includes(me));

  return (
    <div>
      {showCreate && <CreateStartupModal me={me} dk={dk} onClose={() => setShowCreate(false)} onSave={handleCreated} />}
      {showJoinCode && <JoinCodeModal me={me} dk={dk} onClose={() => setShowJoinCode(false)} onJoined={handleJoined} />}

      {/* Header */}
      <div style={{ background: dk ? "linear-gradient(135deg,#1e3a8a22,#5b21b622)" : "linear-gradient(135deg,#dbeafe,#ede9fe)", border: `1px solid ${dk ? "#3b82f630" : "#bfdbfe"}`, borderRadius: 18, padding: "16px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 900, color: th.txt }}>🚀 Colab</h2>
          <p style={{ margin: 0, fontSize: 13, color: th.txt2 }}>Startup OS · Discover · Collaborate · Build</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setShowJoinCode(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "8px 14px", color: th.txt2, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>🔑 Enter Code</button>
          <button onClick={() => setShowCreate(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", border: "none", borderRadius: 10, padding: "8px 16px", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer" }}><PlusCircle size={14} /> Create Startup</button>
        </div>
      </div>

      {/* My Startups */}
      {myStartups.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: th.txt3, letterSpacing: 0.5, marginBottom: 8, textTransform: "uppercase" }}>My Startups</div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {myStartups.map(s => (
              <button key={s.id} onClick={() => setSelected(s)} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8, background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 12, padding: "8px 12px", cursor: "pointer" }}>
                <Logo src={s.logo} size={28} radius={8} fontSize={16} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: th.txt }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>{s.referral_code}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: th.txt3 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search startups…" style={{ width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "9px 12px 9px 34px", fontSize: 13, outline: "none", color: th.txt, boxSizing: "border-box" }} />
        </div>
        <button onClick={() => setSavedOnly(v => !v)} style={{ background: savedOnly ? "rgba(99,102,241,0.15)" : th.surf2, border: `1px solid ${savedOnly ? "#6366f140" : th.bdr}`, borderRadius: 10, padding: "0 14px", color: savedOnly ? "#6366f1" : th.txt2, cursor: "pointer", flexShrink: 0, fontSize: 12, fontWeight: 600 }}>🔖 {savedOnly ? "All" : "Saved"}</button>
      </div>

      {/* Startup List */}
      {loading ? <Spin dk={dk} msg="Loading startups…" /> : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: th.txt3, animation: "fadeUp 0.4s ease both" }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🚀</div>
          <p style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px", color: th.txt }}>{savedOnly ? "No saved startups" : "No startups yet"}</p>
          <p style={{ fontSize: 14, margin: "0 0 20px" }}>{savedOnly ? "Save startups to see them here" : "Be the first to create one!"}</p>
          {!savedOnly && <button onClick={() => setShowCreate(true)} style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", border: "none", borderRadius: 12, padding: "10px 24px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Create Startup</button>}
        </div>
      ) : filtered.map((s, i) => {
        const isOwner = s.created_by === me || (s.founders || []).includes(me);
        const founders = (s.founders || [s.created_by]).filter(Boolean);
        const latestUpd = latestUpdates[s.id];
        const isSaved = savedIds.includes(s.id);
        return (
          <div key={s.id} style={{ animation: `fadeUp 0.42s cubic-bezier(0.22,1,0.36,1) ${Math.min(i * 55, 440)}ms both` }}>
            <Card dk={dk} anim={false}>
              <div onClick={() => setSelected(s)} style={{ cursor: "pointer" }}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 12 }}>
                  <Logo src={s.logo} size={56} radius={16} fontSize={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: th.txt }}>{s.name}</div>
                      <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                        {isSaved && <span style={{ fontSize: 12, color: "#6366f1" }}>🔖</span>}
                        {isOwner && <span style={{ background: "#f59e0b18", color: "#f59e0b", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, border: "1px solid #f59e0b40" }}>OWNER</span>}
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
              </div>
              <div style={{ borderTop: `1px solid ${th.bdr}`, marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: th.txt3 }}>{s.created_at ? ago(new Date(s.created_at).getTime()) + " ago" : ""}</span>
                  <button onClick={e => { e.stopPropagation(); toggleSave(s.id); }} style={{ background: isSaved ? "rgba(99,102,241,0.1)" : "none", border: isSaved ? "1px solid #6366f140" : "none", borderRadius: 6, padding: "3px 6px", cursor: "pointer", color: isSaved ? "#6366f1" : th.txt3, fontSize: 12, display: "flex", alignItems: "center" }}>🔖</button>
                </div>
                <button onClick={() => setSelected(s)} style={{ display: "flex", alignItems: "center", gap: 5, background: isOwner ? "linear-gradient(135deg,#3b82f6,#6366f1)" : "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 10, padding: "7px 18px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }} data-testid={`button-join-${s.id}`}>
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
