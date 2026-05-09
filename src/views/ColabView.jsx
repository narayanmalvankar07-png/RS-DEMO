import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { PlusCircle, Search, ArrowLeft, Globe, Github, Twitter, Linkedin, Copy, Check, X, Send, FileText, Edit2, Trash2, ChevronRight, Lock, MessageSquare, Megaphone, Calendar, Video, Users, Reply } from "lucide-react";
import { T } from "../config/constants.js";
import { db } from "../services/supabase.js";
import { ago } from "../utils/helpers.js";
import Card from "../components/ui/Card.jsx";
import Av from "../components/ui/Av.jsx";
import Spin from "../components/ui/Spin.jsx";

// ─── Logo renderer ─────────────────────────────────────────────────
function Logo({ src, size = 56, radius = 16, fontSize = 28 }) {
  const isImg = src && (src.startsWith("data:") || src.startsWith("http"));
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize, flexShrink: 0, overflow: "hidden" }}>
      {isImg ? <img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="logo" /> : (src || "🚀")}
    </div>
  );
}

// ─── Constants ─────────────────────────────────────────────────────
const genRefCode = n => n.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();

const PAGE_TYPES = [
  { id: "community",  label: "Community",  desc: "Public audience — announcements, community engagement",         c: "#3b82f6", e: "🌐" },
  { id: "product",    label: "Product",    desc: "Product updates & roadmap",                                     c: "#10b981", e: "🚀" },
  { id: "tech",       label: "Tech",       desc: "Engineers — dev logs, architecture, code discussions",          c: "#8b5cf6", e: "🤖" },
  { id: "investment", label: "Investment", desc: "Investors & advisors — pitch decks, funding updates, traction", c: "#f59e0b", e: "💰" },
  { id: "marketing",  label: "Marketing",  desc: "Growth team — campaigns, content strategy, analytics",          c: "#ec4899", e: "📣" },
  { id: "sales",      label: "Sales",      desc: "Sales team — deals, pipeline, customer outreach",               c: "#06b6d4", e: "🤝" },
];

const JOIN_ROLES = [
  { id: "developer",  label: "Developer",  e: "⚡", c: "#3b82f6" },
  { id: "designer",   label: "Designer",   e: "🎨", c: "#ec4899" },
  { id: "marketer",   label: "Marketer",   e: "📢", c: "#f97316" },
  { id: "investor",   label: "Investor",   e: "💰", c: "#10b981" },
  { id: "advisor",    label: "Advisor",    e: "🎯", c: "#8b5cf6" },
  { id: "cofounder",  label: "Co-Founder", e: "🚀", c: "#ef4444" },
];

// ─── Local storage helpers ──────────────────────────────────────────
const ls = {
  get: (k, def = []) => { try { return JSON.parse(localStorage.getItem(k) ?? "null") ?? def; } catch { return def; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ─── CopyBtn ───────────────────────────────────────────────────────
function CopyBtn({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} style={{ display: "flex", alignItems: "center", gap: 5, background: copied ? "#10b98118" : "rgba(255,255,255,0.07)", border: `1px solid ${copied ? "#10b98140" : "rgba(255,255,255,0.12)"}`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: copied ? "#10b981" : "#94a3b8", fontSize: 12, fontWeight: 600 }}>
      {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? "Copied!" : label}
    </button>
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
function PageChatView({ page, startup, me, profiles, dk, onBack }) {
  const th = T(dk);
  const pt = PAGE_TYPES.find(p => p.id === page.type_id) || PAGE_TYPES[0];
  const MSG_KEY = `rs_msgs_${page.id}`;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    (async () => {
      const remote = await db.get("rs_page_messages", `page_id=eq.${page.id}&order=created_at.asc&limit=200`);
      if (remote?.length) { setMessages(remote); }
      else { setMessages(ls.get(MSG_KEY, [])); }
    })();
  }, [page.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    const payload = { page_id: page.id, startup_id: startup.id, user_id: me, content: text.trim(), reply_to_id: replyTo?.id || null, reply_to_content: replyTo?.content || null, reply_to_user: replyTo?.user_id || null };
    const saved = await db.post("rs_page_messages", payload);
    const msg = saved || { id: `local_${Date.now()}`, ...payload, created_at: new Date().toISOString() };
    if (!saved) { const loc = ls.get(MSG_KEY, []); ls.set(MSG_KEY, [...loc, msg]); }
    setMessages(m => [...m, msg]);
    setText(""); setReplyTo(null); setSending(false);
  };

  const isMe = uid => uid === me;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 180px)", minHeight: 400, animation: "fadeUp 0.25s ease both" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0 14px", borderBottom: `1px solid ${th.bdr}`, flexShrink: 0 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", cursor: "pointer", color: th.txt2, fontSize: 13, fontWeight: 600, padding: 0 }}>
          <ArrowLeft size={15} />
        </button>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${pt.c}20`, border: `1px solid ${pt.c}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{pt.e}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: th.txt }}>{page.name}</div>
          <div style={{ fontSize: 11, color: th.txt3 }}>{startup.name} · {pt.label} page</div>
        </div>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 0", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", margin: "auto", color: th.txt3, fontSize: 13 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>{pt.e}</div>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : messages.map(msg => {
          const mine = isMe(msg.user_id);
          const prof = profiles[msg.user_id] || { name: "Member" };
          const replyProf = msg.reply_to_user ? (profiles[msg.reply_to_user] || { name: "Member" }) : null;
          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: mine ? "row-reverse" : "row", alignItems: "flex-end", gap: 8, paddingLeft: mine ? 40 : 0, paddingRight: mine ? 0 : 40 }}>
              {!mine && <Av profile={prof} size={28} />}
              <div style={{ maxWidth: "75%" }}>
                {!mine && <div style={{ fontSize: 11, fontWeight: 700, color: pt.c, marginBottom: 3, paddingLeft: 4 }}>{prof.name}</div>}
                {msg.reply_to_content && (
                  <div style={{ background: mine ? "rgba(255,255,255,0.15)" : th.surf2, borderLeft: `3px solid ${pt.c}`, borderRadius: "6px 6px 0 0", padding: "5px 10px", marginBottom: -4 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: pt.c }}>{replyProf?.name || "Member"}</div>
                    <div style={{ fontSize: 11, color: th.txt3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{msg.reply_to_content}</div>
                  </div>
                )}
                <div
                  style={{ background: mine ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : (dk ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.85)"), border: mine ? "none" : `1px solid ${th.bdr}`, borderRadius: mine ? "16px 4px 16px 16px" : "4px 16px 16px 16px", padding: "9px 13px", cursor: "pointer", position: "relative" }}
                  onDoubleClick={() => setReplyTo(msg)}
                >
                  <p style={{ margin: 0, fontSize: 13, color: mine ? "#fff" : th.txt, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</p>
                  <div style={{ fontSize: 10, color: mine ? "rgba(255,255,255,0.6)" : th.txt3, textAlign: "right", marginTop: 4 }}>{msg.created_at ? ago(new Date(msg.created_at).getTime()) : ""}</div>
                </div>
              </div>
              {mine && <div style={{ width: 28 }} />}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: th.surf2, borderTop: `1px solid ${th.bdr}`, borderBottom: `1px solid ${th.bdr}`, flexShrink: 0 }}>
          <Reply size={14} color={th.txt3} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: pt.c, fontWeight: 700 }}>{profiles[replyTo.user_id]?.name || "Member"}</div>
            <div style={{ fontSize: 12, color: th.txt3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{replyTo.content}</div>
          </div>
          <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3 }}><X size={14} /></button>
        </div>
      )}

      {/* Input area */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 0 0", borderTop: replyTo ? "none" : `1px solid ${th.bdr}`, flexShrink: 0 }}>
        <Av profile={profiles[me] || { name: "Me" }} size={34} />
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && text.trim()) { e.preventDefault(); send(); } }}
          placeholder="Type a message…"
          style={{ flex: 1, background: dk ? "rgba(255,255,255,0.06)" : "#f8fafc", border: `1px solid ${th.bdr}`, borderRadius: 22, padding: "10px 16px", fontSize: 13, outline: "none", color: th.txt, fontFamily: "inherit" }}
          data-testid="input-page-message"
        />
        <button onClick={send} disabled={!text.trim() || sending} style={{ width: 38, height: 38, borderRadius: "50%", background: text.trim() ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : th.surf2, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: text.trim() ? "pointer" : "default", flexShrink: 0 }} data-testid="button-send-message">
          <Send size={15} color={text.trim() ? "#fff" : th.txt3} />
        </button>
      </div>
    </div>
  );
}

// ─── Meetings Tab ───────────────────────────────────────────────────
function MeetingsTab({ pages, startup, me, dk }) {
  const th = T(dk);
  const [bookingFor, setBookingFor] = useState(null);
  const [meetingsByPage, setMeetingsByPage] = useState({});
  const [form, setForm] = useState({ title: "", date: "", time: "", platform: "google_meet", link: "", agenda: "" });
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
    const payload = { page_id: bookingFor, startup_id: startup.id, created_by: me, title: form.title.trim(), meeting_date: form.date, meeting_time: form.time, platform: form.platform, link: form.link.trim(), agenda: form.agenda.trim() };
    const saved = await db.post("rs_page_meetings", payload);
    const mtg = saved || { id: `local_${Date.now()}`, ...payload, created_at: new Date().toISOString() };
    if (!saved) { const loc = ls.get(`rs_mtg_${bookingFor}`, []); ls.set(`rs_mtg_${bookingFor}`, [...loc, mtg]); }
    setMeetingsByPage(prev => ({ ...prev, [bookingFor]: [...(prev[bookingFor] || []), mtg] }));
    setForm({ title: "", date: "", time: "", platform: "google_meet", link: "", agenda: "" });
    setBookingFor(null);
    setSaving(false);
  };

  const inp = { background: dk ? "rgba(255,255,255,0.06)" : "#fff", border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", color: th.txt, fontFamily: "inherit", width: "100%", boxSizing: "border-box" };

  return (
    <div>
      <div style={{ fontWeight: 800, fontSize: 16, color: th.txt, marginBottom: 18 }}>All Meetings Across Pages</div>
      {pages.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: th.txt3 }}><div style={{ fontSize: 32 }}>📅</div><p>No pages yet. Create pages first.</p></div>
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
                    {[{ id: "google_meet", label: "Google Meet", e: "📹" }, { id: "zoom", label: "Zoom", e: "📷" }].map(p => (
                      <button key={p.id} onClick={() => setForm(f => ({ ...f, platform: p.id }))}
                        style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${form.platform === p.id ? "#3b82f6" : th.bdr}`, background: form.platform === p.id ? "#3b82f6" : th.surf2, color: form.platform === p.id ? "#fff" : th.txt2, fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        {p.e} {p.label}
                      </button>
                    ))}
                  </div>
                  <input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} placeholder="Meeting link (optional)" style={inp} />
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
              ) : mtgs.map((mtg, i) => (
                <div key={mtg.id} style={{ padding: "12px 16px", borderTop: i === 0 ? "none" : `1px solid ${th.bdr}`, display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#3b82f618", border: "1px solid #3b82f630", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>📅</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: th.txt }}>{mtg.title}</div>
                    <div style={{ fontSize: 12, color: th.txt3, marginTop: 2 }}>{mtg.meeting_date} · {mtg.meeting_time} · {mtg.platform === "zoom" ? "📷 Zoom" : "📹 Google Meet"}</div>
                    {mtg.link && <a href={mtg.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#3b82f6", fontWeight: 600 }}>Join link →</a>}
                    {mtg.agenda && <p style={{ fontSize: 12, color: th.txt2, margin: "4px 0 0", fontStyle: "italic" }}>{mtg.agenda}</p>}
                  </div>
                </div>
              ))}
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
  const [form, setForm] = useState({ name: existing?.name || "", logo: existing?.logo || "🚀", description: existing?.description || "", website: existing?.website || "", github_link: existing?.github_link || "", twitter: existing?.social_links?.twitter || "", linkedin: existing?.social_links?.linkedin || "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name.trim() && form.description.trim();
  const EMOJIS = ["🚀","💡","⚡","🎯","💰","🌍","🔥","🤝","📊","🎨","🛠️","🧠","💎","🌱","🔬","📱"];
  const inp = { width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box", color: th.txt, fontFamily: "inherit" };

  const save = async () => {
    if (!valid) return; setSaving(true);
    const payload = { name: form.name.trim(), logo: form.logo, description: form.description.trim(), website: form.website.trim(), github_link: form.github_link.trim(), social_links: { twitter: form.twitter.trim(), linkedin: form.linkedin.trim() }, created_by: me, founders: existing?.founders || [me], referral_code: existing?.referral_code || genRefCode(form.name) };
    let result;
    if (existing?.id) { await db.patch("rs_startups", `id=eq.${existing.id}`, payload); result = { ...existing, ...payload }; }
    else {
      result = await db.post("rs_startups", payload);
      if (result?.id) {
        const defaultPages = ["community", "product"].map(tid => { const pt = PAGE_TYPES.find(p => p.id === tid); return { startup_id: result.id, name: pt.label, description: pt.desc, type_id: tid }; });
        await db.postMany("rs_startup_pages", defaultPages);
      }
    }
    setSaving(false); onSave(result); onClose();
  };

  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: dk ? "rgba(13,20,38,0.97)" : "rgba(255,255,255,0.97)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: `1px solid ${th.bdr}`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 460, animation: "fadeUp 0.25s ease both", margin: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: th.txt }}>{existing ? "Edit Startup" : `Create Startup — Step ${step}/2`}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3 }}><X size={18} /></button>
        </div>
        {!existing && <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>{[1,2].map(s => <div key={s} style={{ flex: 1, height: 3, borderRadius: 99, background: s <= step ? "#3b82f6" : th.bdr, transition: "all 0.3s" }} />)}</div>}
        {step === 1 && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 4 }}>Logo Emoji</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, background: th.surf2, borderRadius: 10, padding: 10, border: `1px solid ${th.bdr}` }}>
                {EMOJIS.map(e => <button key={e} onClick={() => set("logo", e)} style={{ fontSize: 20, background: form.logo === e ? "#3b82f618" : "none", border: form.logo === e ? "2px solid #3b82f6" : "2px solid transparent", borderRadius: 8, width: 36, height: 36, cursor: "pointer" }}>{e}</button>)}
              </div>
            </div>
            {[{ k: "name", l: "Startup Name *", p: "e.g. SkillSwap" }, { k: "description", l: "Description *", p: "What are you building?", rows: 3 }].map(({ k, l, p, rows }) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: th.txt2, display: "block", marginBottom: 4 }}>{l}</label>
                {rows ? <textarea value={form[k]} onChange={e => set(k, e.target.value)} placeholder={p} rows={rows} style={{ ...inp, resize: "vertical" }} /> : <input value={form[k]} onChange={e => set(k, e.target.value)} placeholder={p} style={inp} />}
              </div>
            ))}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "10px", background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 12, cursor: "pointer", color: th.txt2, fontWeight: 600 }}>Cancel</button>
              <button onClick={() => existing ? save() : setStep(2)} disabled={!valid} style={{ flex: 2, padding: "10px", background: valid ? "#3b82f6" : th.surf2, border: "none", borderRadius: 12, cursor: valid ? "pointer" : "default", color: valid ? "#fff" : th.txt3, fontWeight: 700 }}>{existing ? (saving ? "Saving…" : "Save Changes") : "Next →"}</button>
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
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: "10px", background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 12, cursor: "pointer", color: th.txt2, fontWeight: 600 }}>← Back</button>
              <button onClick={save} disabled={saving} style={{ flex: 2, padding: "10px", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", border: "none", borderRadius: 12, cursor: "pointer", color: "#fff", fontWeight: 700 }}>{saving ? "Launching…" : "Launch Startup 🚀"}</button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.getElementById("portal-root")
  );
}

// ─── Join via Code Modal ────────────────────────────────────────────
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
    if (!res?.length) setError("Invalid code.");
    else setStartup(res[0]);
    setChecking(false);
  };

  const submit = async () => {
    if (!roles.length) return;
    setSubmitting(true);
    await db.post("rs_page_access_requests", { startup_id: startup.id, user_id: me, selected_roles: roles, message: message.trim(), status: "pending" });
    setSubmitting(false); onJoined(startup); onClose();
  };

  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: dk ? "rgba(13,20,38,0.97)" : "rgba(255,255,255,0.97)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: `1px solid ${th.bdr}`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 380, animation: "fadeUp 0.25s ease both" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: th.txt }}>{step === "code" ? "Join via Code" : "Select Your Role"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3 }}><X size={18} /></button>
        </div>
        {step === "code" ? (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); setStartup(null); }} onKeyDown={e => e.key === "Enter" && check()} placeholder="e.g. SKILL-A3B2" style={{ flex: 1, background: th.inp, border: `1px solid ${error ? "#ef4444" : startup ? "#10b981" : th.inpB}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, outline: "none", color: th.txt, fontFamily: "monospace" }} />
              <button onClick={check} disabled={checking || !code.trim()} style={{ background: "#3b82f6", border: "none", borderRadius: 10, padding: "0 16px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{checking ? "…" : "Check"}</button>
            </div>
            {error && <p style={{ fontSize: 13, color: "#ef4444", margin: "0 0 12px" }}>✕ {error}</p>}
            {startup && (
              <div style={{ background: th.surf2, borderRadius: 14, padding: 14, marginBottom: 16, border: "1px solid #10b98130" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <Logo src={startup.logo} size={42} radius={11} fontSize={22} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: th.txt }}>{startup.name}</div>
                    <div style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>✓ Valid startup</div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: th.txt2, margin: 0 }}>{startup.description?.slice(0, 100)}…</p>
              </div>
            )}
            {startup && <button onClick={() => setStep("roles")} style={{ width: "100%", padding: "11px", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Continue →</button>}
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: th.txt2, margin: "0 0 14px" }}>Joining <strong style={{ color: th.txt }}>{startup.name}</strong></p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              {JOIN_ROLES.map(r => {
                const sel = roles.includes(r.id);
                return <button key={r.id} onClick={() => setRoles(rs => rs.includes(r.id) ? rs.filter(x => x !== r.id) : [...rs, r.id])} style={{ background: sel ? `${r.c}20` : th.surf2, border: `1.5px solid ${sel ? r.c : th.bdr}`, borderRadius: 10, padding: "10px", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>{r.e}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: sel ? r.c : th.txt2 }}>{r.label}</div>
                </button>;
              })}
            </div>
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Why do you want to join? (optional)" rows={2} style={{ width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, outline: "none", color: th.txt, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 14 }} />
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

// ─── Visitor / Member Detail View ──────────────────────────────────
function VisitorDetail({ startup, me, profiles, dk, onBack, addNotif }) {
  const th = T(dk);
  const [tab, setTab] = useState("overview");
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

  // Per-page requests/access (localStorage)
  const PG_REQ_KEY = `rs_pg_req_${startup.id}`;
  const PG_MEM_KEY = `rs_pg_mem_${startup.id}`;
  const [pageReqs, setPageReqs] = useState(() => ls.get(PG_REQ_KEY, []));
  const [pageMembers, setPageMembers] = useState(() => ls.get(PG_MEM_KEY, []));

  const isStartupMember = myRequest?.status === "approved";

  useEffect(() => {
    (async () => {
      const [reqs, pgs, mbs, upds] = await Promise.all([
        db.get("rs_page_access_requests", `startup_id=eq.${startup.id}&user_id=eq.${me}`),
        db.get("rs_startup_pages", `startup_id=eq.${startup.id}&order=created_at.asc`),
        db.get("rs_page_access", `startup_id=eq.${startup.id}&status=eq.approved`),
        db.get("rs_startup_updates", `startup_id=eq.${startup.id}&order=created_at.desc&limit=20`),
      ]);
      setMyRequest(reqs?.[0] || null);
      setPages(pgs || []);
      setMembers([...new Map((mbs || []).map(m => [m.user_id, m])).values()]);
      setUpdates(upds || []);
      setLoading(false);
    })();
  }, [startup.id, me]);

  const submitJoin = async () => {
    if (!joinRoles.length) return;
    setSubmittingJoin(true);
    const saved = await db.post("rs_page_access_requests", { startup_id: startup.id, user_id: me, selected_roles: joinRoles, message: joinMsg.trim(), status: "pending" });
    if (saved) { setMyRequest(saved); addNotif?.({ type: "success", msg: "Join request sent!" }); }
    setSubmittingJoin(false); setShowJoinForm(false);
  };

  const requestPageAccess = (pageId) => {
    const existing = pageReqs.find(r => r.page_id === pageId && r.user_id === me);
    if (existing) return;
    const req = { id: `pgreq_${Date.now()}`, page_id: pageId, startup_id: startup.id, user_id: me, status: "pending", created_at: new Date().toISOString() };
    const updated = [...pageReqs, req];
    setPageReqs(updated); ls.set(PG_REQ_KEY, updated);
    addNotif?.({ type: "success", msg: "Page access requested!" });
  };

  const getPageAccess = (pageId) => {
    const mem = pageMembers.find(m => m.page_id === pageId && m.user_id === me);
    if (mem) return "approved";
    const req = pageReqs.find(r => r.page_id === pageId && r.user_id === me);
    return req?.status || null;
  };

  const founders = (startup.founders || [startup.created_by]).filter(Boolean);
  const teamUids = [...new Set([...founders, ...members.map(m => m.user_id)])];
  const headerBg = dk ? "linear-gradient(135deg,rgba(30,58,138,0.25),rgba(91,33,182,0.2))" : "linear-gradient(135deg,#e0e7ff,#ede9fe)";
  const TABS = [{ id: "overview", label: "Overview" }, { id: "pages", label: "Pages" }, { id: "updates", label: "Updates" }, { id: "feedback", label: "Feedback" }];

  if (activePage) return <PageChatView page={activePage} startup={startup} me={me} profiles={profiles} dk={dk} onBack={() => setActivePage(null)} />;

  return (
    <div style={{ animation: "fadeUp 0.3s ease both" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", cursor: "pointer", color: th.txt2, fontSize: 13, fontWeight: 600, padding: "0 0 14px" }}>
        <ArrowLeft size={15} /> Back to Colab
      </button>

      {/* Startup header card */}
      <div style={{ background: headerBg, border: dk ? "1px solid rgba(99,102,241,0.2)" : "1px solid #c7d2fe", borderRadius: 20, padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Logo src={startup.logo} size={64} radius={16} fontSize={32} />
            <div>
              <div style={{ fontWeight: 900, fontSize: 22, color: th.txt }}>{startup.name}</div>
              <div style={{ fontSize: 13, color: th.txt2, marginTop: 3 }}>{startup.description?.slice(0, 80)}{startup.description?.length > 80 ? "…" : ""}</div>
            </div>
          </div>
          {!myRequest ? (
            <button onClick={() => setShowJoinForm(v => !v)} style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 12, padding: "10px 22px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", flexShrink: 0 }}>Join Startup</button>
          ) : (
            <div style={{ flexShrink: 0, padding: "8px 16px", borderRadius: 12, fontWeight: 700, fontSize: 13, background: myRequest.status === "approved" ? "#10b98118" : myRequest.status === "rejected" ? "#ef444418" : "#f59e0b18", color: myRequest.status === "approved" ? "#10b981" : myRequest.status === "rejected" ? "#ef4444" : "#f59e0b", border: `1px solid ${myRequest.status === "approved" ? "#10b98140" : myRequest.status === "rejected" ? "#ef444440" : "#f59e0b40"}` }}>
              {myRequest.status === "approved" ? "✅ Member" : myRequest.status === "rejected" ? "❌ Not approved" : "⏳ Pending"}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: teamUids.length ? 14 : 0 }}>
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

      {/* Join role form */}
      {showJoinForm && !myRequest && (
        <Card dk={dk} anim={false} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: th.txt }}>Select your role(s)</div>
            <button onClick={() => setShowJoinForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3 }}><X size={16} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
            {JOIN_ROLES.map(r => {
              const sel = joinRoles.includes(r.id);
              return <button key={r.id} onClick={() => setJoinRoles(rs => rs.includes(r.id) ? rs.filter(x => x !== r.id) : [...rs, r.id])} style={{ background: sel ? `${r.c}20` : th.surf2, border: `1.5px solid ${sel ? r.c : th.bdr}`, borderRadius: 10, padding: "10px 8px", cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: 18, marginBottom: 3 }}>{r.e}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: sel ? r.c : th.txt2 }}>{r.label}</div>
              </button>;
            })}
          </div>
          <textarea value={joinMsg} onChange={e => setJoinMsg(e.target.value)} placeholder="Why do you want to join? (optional)" rows={2} style={{ width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, outline: "none", color: th.txt, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 10 }} />
          <button onClick={submitJoin} disabled={!joinRoles.length || submittingJoin} style={{ width: "100%", padding: "10px", background: joinRoles.length ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : th.surf2, border: "none", borderRadius: 10, cursor: joinRoles.length ? "pointer" : "default", color: joinRoles.length ? "#fff" : th.txt3, fontWeight: 700 }}>{submittingJoin ? "Sending…" : "Send Request"}</button>
        </Card>
      )}

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
              <div style={{ fontSize: 13, color: th.txt3, marginBottom: 14 }}>Click a page to chat or request access to join.</div>
              {pages.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: th.txt3 }}><div style={{ fontSize: 32 }}>📄</div><p>No pages created yet.</p></div>
              ) : pages.map(pg => {
                const pt = PAGE_TYPES.find(p => p.id === pg.type_id) || PAGE_TYPES[0];
                const access = getPageAccess(pg.id);
                return (
                  <div key={pg.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10, gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: `${pt.c}18`, border: `1px solid ${pt.c}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{pt.e}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: th.txt }}>{pg.name}</div>
                        <div style={{ fontSize: 12, color: th.txt3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pg.description || pt.desc}</div>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {access === "approved" ? (
                        <button onClick={() => setActivePage(pg)} style={{ display: "flex", alignItems: "center", gap: 5, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 8, padding: "7px 14px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}><MessageSquare size={12} /> Chat</button>
                      ) : access === "pending" ? (
                        <span style={{ background: "#f59e0b18", color: "#f59e0b", fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 8, border: "1px solid #f59e0b40" }}>⏳ Pending</span>
                      ) : (
                        <button onClick={() => requestPageAccess(pg.id)} style={{ display: "flex", alignItems: "center", gap: 5, background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "7px 12px", color: th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}><Lock size={11} /> Request</button>
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
                <div style={{ textAlign: "center", padding: 40, color: th.txt3 }}><div style={{ fontSize: 32 }}>📢</div><p>No updates yet.</p></div>
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

          {tab === "feedback" && <FeedbackSection startupId={startup.id} me={me} profiles={profiles} dk={dk} />}
        </>
      )}
    </div>
  );
}

// ─── Founder Dashboard ─────────────────────────────────────────────
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
  const [activePage, setActivePage] = useState(null);

  // Per-page requests/access (localStorage)
  const PG_REQ_KEY = `rs_pg_req_${startup.id}`;
  const PG_MEM_KEY = `rs_pg_mem_${startup.id}`;
  const [pageReqs, setPageReqs] = useState(() => ls.get(PG_REQ_KEY, []));
  const [pageMembers, setPageMembers] = useState(() => ls.get(PG_MEM_KEY, []));

  const pendingPageReqs = pageReqs.filter(r => r.status === "pending");

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
    setMembers(ms => ms.find(m => m.user_id === req.user_id) ? ms : [...ms, { user_id: req.user_id, status: "approved" }]);
  };

  const rejectRequest = async (req) => {
    await db.patch("rs_page_access_requests", `id=eq.${req.id}`, { status: "rejected" });
    setRequests(rs => rs.map(r => r.id === req.id ? { ...r, status: "rejected" } : r));
  };

  const approvePageReq = (req) => {
    const updReqs = pageReqs.map(r => r.id === req.id ? { ...r, status: "approved" } : r);
    setPageReqs(updReqs); ls.set(PG_REQ_KEY, updReqs);
    const mems = [...pageMembers, { page_id: req.page_id, user_id: req.user_id }];
    setPageMembers(mems); ls.set(PG_MEM_KEY, mems);
    addNotif?.({ type: "success", msg: "Page access granted!" });
  };

  const rejectPageReq = (req) => {
    const updReqs = pageReqs.map(r => r.id === req.id ? { ...r, status: "rejected" } : r);
    setPageReqs(updReqs); ls.set(PG_REQ_KEY, updReqs);
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
    setUpdateText(""); setPosting(false);
    addNotif?.({ type: "success", msg: "Update posted!" });
  };

  const deleteUpdate = (id) => {
    db.del("rs_startup_updates", `id=eq.${id}`);
    setUpdates(us => us.filter(u => u.id !== id));
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
  const totalPending = pendingCount + pendingPageReqs.length;

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "requests", label: `Requests${totalPending ? ` (${totalPending})` : ""}` },
    { id: "pages", label: "Pages" },
    { id: "members", label: "Members" },
    { id: "meetings", label: "Meetings" },
    { id: "updates", label: "Updates" },
    { id: "feedback", label: "Feedback" },
  ];

  const inp = { background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box", color: th.txt, fontFamily: "inherit" };

  if (activePage) return <PageChatView page={activePage} startup={startup} me={me} profiles={profiles} dk={dk} onBack={() => setActivePage(null)} />;

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
        {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ flexShrink: 0, padding: "7px 14px", borderRadius: 9, border: "none", background: tab === t.id ? "#3b82f6" : "transparent", color: tab === t.id ? "#fff" : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{t.label}</button>)}
      </div>

      {loading ? <Spin dk={dk} msg="Loading…" /> : (
        <>
          {tab === "overview" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
                {[{ l: "Members", v: members.length, c: "#3b82f6", e: "👥" }, { l: "Pages", v: pages.length, c: "#8b5cf6", e: "📄" }, { l: "Pending", v: totalPending, c: "#f59e0b", e: "📬" }].map(s => (
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
              {/* Startup join requests */}
              <div style={{ fontSize: 13, fontWeight: 700, color: th.txt3, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Startup Join Requests</div>
              {requests.length === 0 ? (
                <Card dk={dk} anim={false}><div style={{ textAlign: "center", padding: "16px 0", color: th.txt3, fontSize: 13 }}>📬 No join requests yet.</div></Card>
              ) : requests.map(req => {
                const prof = profiles[req.user_id] || { name: "Applicant" };
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
                        {(req.selected_roles || []).length > 0 && (
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
                            {(req.selected_roles || []).map(rid => { const r = JOIN_ROLES.find(x => x.id === rid); return r ? <span key={rid} style={{ background: `${r.c}18`, color: r.c, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99 }}>{r.e} {r.label}</span> : null; })}
                          </div>
                        )}
                        {req.message && <p style={{ fontSize: 12, color: th.txt2, margin: "0 0 8px", fontStyle: "italic" }}>"{req.message}"</p>}
                        {req.status === "pending" && (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => approveRequest(req)} style={{ background: "#10b98118", border: "1px solid #10b98140", borderRadius: 8, padding: "6px 14px", cursor: "pointer", color: "#10b981", fontSize: 12, fontWeight: 700 }}>✓ Approve</button>
                            <button onClick={() => rejectRequest(req)} style={{ background: "#ef444418", border: "1px solid #ef444440", borderRadius: 8, padding: "6px 14px", cursor: "pointer", color: "#ef4444", fontSize: 12, fontWeight: 700 }}>✕ Reject</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}

              {/* Page access requests */}
              {pageReqs.length > 0 && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: th.txt3, marginTop: 20, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Page Access Requests</div>
                  {pageReqs.map(req => {
                    const prof = profiles[req.user_id] || { name: "User" };
                    const pg = pages.find(p => p.id === req.page_id);
                    const pt = PAGE_TYPES.find(p => p.id === pg?.type_id) || PAGE_TYPES[0];
                    return (
                      <Card dk={dk} key={req.id} anim={false}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <Av profile={prof} size={40} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: th.txt }}>{prof.name}</div>
                            <div style={{ fontSize: 12, color: th.txt3 }}>Requesting access to <span style={{ color: pt.c, fontWeight: 600 }}>{pt.e} {pg?.name || "a page"}</span></div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: req.status === "approved" ? "#10b98118" : req.status === "rejected" ? "#ef444418" : "#f59e0b18", color: req.status === "approved" ? "#10b981" : req.status === "rejected" ? "#ef4444" : "#f59e0b" }}>{req.status?.toUpperCase()}</span>
                          {req.status === "pending" && (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => approvePageReq(req)} style={{ background: "#10b98118", border: "1px solid #10b98140", borderRadius: 7, padding: "5px 10px", cursor: "pointer", color: "#10b981", fontSize: 12, fontWeight: 700 }}>✓</button>
                              <button onClick={() => rejectPageReq(req)} style={{ background: "#ef444418", border: "1px solid #ef444440", borderRadius: 7, padding: "5px 10px", cursor: "pointer", color: "#ef4444", fontSize: 12, fontWeight: 700 }}>✕</button>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </>
              )}
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
                    <select value={newPageType} onChange={e => setNewPageType(e.target.value)} style={{ ...inp, width: "auto" }}>
                      {PAGE_TYPES.map(pt => <option key={pt.id} value={pt.id}>{pt.e} {pt.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setShowAddPage(false)} style={{ flex: 1, padding: "8px", background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 10, cursor: "pointer", color: th.txt2, fontWeight: 600 }}>Cancel</button>
                    <button onClick={addPage} disabled={!newPageName.trim()} style={{ flex: 2, padding: "8px", background: "#3b82f6", border: "none", borderRadius: 10, cursor: "pointer", color: "#fff", fontWeight: 700 }}>Create Page</button>
                  </div>
                </Card>
              )}
              {pages.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: th.txt3 }}><div style={{ fontSize: 32 }}>📄</div><p>No pages yet.</p></div>
              ) : pages.map(pg => {
                const pt = PAGE_TYPES.find(p => p.id === pg.type_id) || PAGE_TYPES[0];
                const pgMembers = pageMembers.filter(m => m.page_id === pg.id);
                return (
                  <Card dk={dk} key={pg.id} anim={false}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${pt.c}18`, border: `1px solid ${pt.c}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{pt.e}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: th.txt, fontSize: 14 }}>{pg.name}</div>
                          <div style={{ fontSize: 12, color: th.txt3 }}>{pgMembers.length} member{pgMembers.length !== 1 ? "s" : ""} with access</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <button onClick={() => setActivePage(pg)} style={{ display: "flex", alignItems: "center", gap: 4, background: `${pt.c}18`, border: `1px solid ${pt.c}30`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: pt.c, fontSize: 12, fontWeight: 600 }}><MessageSquare size={12} /> Chat</button>
                        <button onClick={() => deletePage(pg.id)} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3, display: "flex", padding: 6 }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {tab === "members" && (
            <div>
              {members.length === 0 ? (
                <div style={{ textAlign: "center", padding: 48, color: th.txt3 }}><div style={{ fontSize: 36 }}>👥</div><p>No members yet.</p></div>
              ) : members.map(m => {
                const prof = profiles[m.user_id] || { name: "Member" };
                const isFounderMember = (startup.founders || [startup.created_by]).includes(m.user_id);
                const memberPages = pageMembers.filter(pm => pm.user_id === m.user_id).map(pm => pages.find(p => p.id === pm.page_id)).filter(Boolean);
                return (
                  <Card dk={dk} key={m.user_id} anim={false}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <Av profile={prof} size={42} bal={bals[m.user_id] ?? 0} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <div>
                            <div style={{ fontWeight: 700, color: th.txt, fontSize: 14 }}>{prof.name}</div>
                            <div style={{ fontSize: 12, color: th.txt3 }}>@{prof.handle || m.user_id.slice(0, 8)}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            {isFounderMember && <span style={{ background: "#f59e0b18", color: "#f59e0b", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, border: "1px solid #f59e0b30" }}>FOUNDER</span>}
                            {!isFounderMember && m.user_id !== me && <button onClick={() => removeMember(m.user_id)} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3, display: "flex", padding: 4 }}><X size={14} /></button>}
                          </div>
                        </div>
                        {memberPages.length > 0 && (
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                            {memberPages.map(pg => { const pt = PAGE_TYPES.find(p => p.id === pg.type_id) || PAGE_TYPES[0]; return <span key={pg.id} style={{ background: `${pt.c}18`, color: pt.c, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 6, border: `1px solid ${pt.c}30` }}>{pt.e} {pg.name}</span>; })}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {tab === "meetings" && <MeetingsTab pages={pages} startup={startup} me={me} dk={dk} />}

          {tab === "updates" && (
            <div>
              <Card dk={dk} anim={false} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: th.txt, fontSize: 14, marginBottom: 10 }}>📢 Post an Update</div>
                <textarea value={updateText} onChange={e => setUpdateText(e.target.value)} placeholder="Share what's new with your startup…" rows={3} style={{ width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, outline: "none", color: th.txt, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 10 }} />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={postUpdate} disabled={!updateText.trim() || posting} style={{ display: "flex", alignItems: "center", gap: 6, background: updateText.trim() ? "#3b82f6" : th.surf2, border: "none", borderRadius: 10, padding: "8px 16px", color: updateText.trim() ? "#fff" : th.txt3, fontWeight: 700, fontSize: 13, cursor: updateText.trim() ? "pointer" : "default" }}><Send size={13} />{posting ? "Posting…" : "Post Update"}</button>
                </div>
              </Card>
              {updates.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: th.txt3 }}><div style={{ fontSize: 32 }}>📢</div><p>No updates yet.</p></div>
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

          {tab === "feedback" && <FeedbackSection startupId={startup.id} me={me} profiles={profiles} dk={dk} />}
        </>
      )}
    </div>
  );
}

// ─── StartupDetail dispatcher ──────────────────────────────────────
function StartupDetail({ startup, me, profiles, bals, dk, onBack, addNotif, onStartupUpdated }) {
  const isFounder = startup.created_by === me || (startup.founders || []).includes(me);
  if (isFounder) return <FounderDetail startup={startup} me={me} profiles={profiles} bals={bals} dk={dk} onBack={onBack} addNotif={addNotif} onStartupUpdated={onStartupUpdated} />;
  return <VisitorDetail startup={startup} me={me} profiles={profiles} dk={dk} onBack={onBack} addNotif={addNotif} />;
}

// ─── Main ColabView ────────────────────────────────────────────────
export default function ColabView({ me, dk, profiles, bals, onProfile, addNotif }) {
  const th = T(dk);
  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [savedIds, setSavedIds] = useState(() => ls.get("rs_saved_startups", []));
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
      ls.set("rs_saved_startups", next);
      return next;
    });
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
      {showCreate && <CreateStartupModal me={me} dk={dk} onClose={() => setShowCreate(false)} onSave={s => { if (s) setStartups(prev => { const ex = prev.find(x => x.id === s.id); return ex ? prev.map(x => x.id === s.id ? s : x) : [s, ...prev]; }); addNotif?.({ type: "success", msg: "Startup launched! 🚀" }); }} />}
      {showJoinCode && <JoinCodeModal me={me} dk={dk} onClose={() => setShowJoinCode(false)} onJoined={s => addNotif?.({ type: "success", msg: `Request sent to ${s.name}!` })} />}

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

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: th.txt3 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search startups…" style={{ width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "9px 12px 9px 34px", fontSize: 13, outline: "none", color: th.txt, boxSizing: "border-box" }} />
        </div>
        <button onClick={() => setSavedOnly(v => !v)} style={{ background: savedOnly ? "rgba(99,102,241,0.15)" : th.surf2, border: `1px solid ${savedOnly ? "#6366f140" : th.bdr}`, borderRadius: 10, padding: "0 14px", color: savedOnly ? "#6366f1" : th.txt2, cursor: "pointer", flexShrink: 0, fontSize: 12, fontWeight: 600 }}>🔖 {savedOnly ? "All" : "Saved"}</button>
      </div>

      {loading ? <Spin dk={dk} msg="Loading startups…" /> : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: th.txt3 }}>
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
                <button onClick={() => setSelected(s)} style={{ display: "flex", alignItems: "center", gap: 5, background: isOwner ? "linear-gradient(135deg,#3b82f6,#6366f1)" : "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 10, padding: "7px 18px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }} data-testid={`button-open-${s.id}`}>
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
