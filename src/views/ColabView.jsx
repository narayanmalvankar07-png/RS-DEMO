import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { PlusCircle, Search, ArrowLeft, Globe, Github, Twitter, Linkedin, Copy, Check, X, Send, FileText, Edit2, Trash2, ChevronRight, Lock, MessageSquare, Megaphone, Calendar, Video, Users, Reply, LogIn } from "lucide-react";
import { T } from "../config/constants.js";
import { db } from "../services/supabase.js";
import { ago } from "../utils/helpers.js";
import Card from "../components/ui/Card.jsx";
import Av from "../components/ui/Av.jsx";
import Spin from "../components/ui/Spin.jsx";
import ProfileView from "./ProfileView.jsx";

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
function PageChatView({ page, startup, me, profiles, pageMembers = [], allMembers = [], isFounder = false, dk, onBack }) {
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
  const [tasks, setTasks] = useState(() => ls.get(TASK_KEY, []));
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", assignee_id: "", priority: "medium" });

  // Files
  const FILE_KEY = `rs_files_${page.id}`;
  const [files, setFiles] = useState(() => ls.get(FILE_KEY, []));
  const fileInputRef = useRef(null);

  // Meetings
  const MTG_KEY = `rs_mtg_${page.id}`;
  const [meetings, setMeetings] = useState(() => ls.get(MTG_KEY, []));
  const [showMtgForm, setShowMtgForm] = useState(false);
  const [mtgForm, setMtgForm] = useState({ title: "", date: "", time: "", platform: "google_meet", link: "", agenda: "", with_note: "" });

  // Page member roles
  const ROLES_KEY = `rs_pg_page_roles_${page.id}`;
  const [pageRoles, setPageRoles] = useState(() => ls.get(ROLES_KEY, {}));

  useEffect(() => {
    (async () => {
      const remote = await db.get("rs_page_messages", `page_id=eq.${page.id}&order=created_at.asc&limit=200`);
      if (remote?.length) setMessages(remote);
      else setMessages(ls.get(MSG_KEY, []));
    })();
    (async () => {
      const remote = await db.get("rs_page_meetings", `page_id=eq.${page.id}&order=meeting_date.asc`);
      if (remote?.length) setMeetings(remote);
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
    const updated = [...tasks, task]; setTasks(updated); ls.set(TASK_KEY, updated);
    setTaskForm({ title: "", assignee_id: "", priority: "medium" }); setShowTaskForm(false);
  };

  const cycleTask = (taskId) => {
    const cycle = { todo: "in_progress", in_progress: "done", done: "todo" };
    const updated = tasks.map(t => t.id === taskId ? { ...t, status: cycle[t.status] } : t);
    setTasks(updated); ls.set(TASK_KEY, updated);
  };

  const deleteTask = (id) => { const u = tasks.filter(t => t.id !== id); setTasks(u); ls.set(TASK_KEY, u); };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const entry = { id: `file_${Date.now()}`, name: file.name, size: file.size, type: file.type, uploaded_by: me, created_at: new Date().toISOString() };
    const u = [...files, entry]; setFiles(u); ls.set(FILE_KEY, u); e.target.value = "";
  };
  const deleteFile = (id) => { const u = files.filter(f => f.id !== id); setFiles(u); ls.set(FILE_KEY, u); };

  const bookMeeting = async () => {
    if (!mtgForm.title.trim() || !mtgForm.date || !mtgForm.time) return;
    const payload = { page_id: page.id, startup_id: startup.id, created_by: me, title: mtgForm.title.trim(), meeting_date: mtgForm.date, meeting_time: mtgForm.time, platform: mtgForm.platform, link: mtgForm.link.trim(), agenda: mtgForm.agenda.trim(), with_note: mtgForm.with_note.trim() };
    const saved = await db.post("rs_page_meetings", payload);
    const mtg = saved || { id: `local_${Date.now()}`, ...payload, created_at: new Date().toISOString() };
    if (!saved) { const loc = ls.get(MTG_KEY, []); ls.set(MTG_KEY, [...loc, mtg]); }
    setMeetings(m => [...m, mtg]); setMtgForm({ title: "", date: "", time: "", platform: "google_meet", link: "", agenda: "", with_note: "" }); setShowMtgForm(false);
  };

  const setMemberRole = (userId, role) => { const u = { ...pageRoles, [userId]: role }; setPageRoles(u); ls.set(ROLES_KEY, u); };

  const PRIORITY_C = { low: "#10b981", medium: "#f59e0b", high: "#ef4444" };
  const PAGE_MEMBER_ROLES = [{ id: "admin", label: "Admin", e: "👑", c: "#f59e0b" }, { id: "moderator", label: "Moderator", e: "🛡️", c: "#6366f1" }, { id: "member", label: "Member", e: "👤", c: "#10b981" }];
  const activities = [...messages.map(m => ({ ...m, kind: "msg" })), ...tasks.map(t => ({ ...t, kind: "task" })), ...meetings.map(m => ({ ...m, kind: "mtg" }))].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 40);

  const inp = { background: dk ? "rgba(255,255,255,0.06)" : "#f8fafc", border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", color: th.txt, fontFamily: "inherit", width: "100%", boxSizing: "border-box" };

  const PAGE_TABS = [
    { id: "chat", icon: "💬", label: "Chat" },
    { id: "tasks", icon: "✅", label: "Tasks" },
    { id: "files", icon: "📁", label: "Files" },
    { id: "meetings", icon: "📅", label: "Meetings" },
    { id: "activity", icon: "⚡", label: "Activity" },
    { id: "members", icon: "👥", label: "Members" },
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
          <div style={{ width: 46, height: 46, borderRadius: 14, background: `${pt.c}20`, border: `1px solid ${pt.c}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{pt.e}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: th.txt }}>{page.name}</div>
            <div style={{ fontSize: 12, color: th.txt3, marginTop: 2 }}>{page.description || pt.desc}</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: th.txt3, fontWeight: 600, flexShrink: 0, marginLeft: 12 }}>{pgMems.length} member{pgMems.length !== 1 ? "s" : ""}</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 14, background: th.surf2, borderRadius: 12, padding: 4, border: `1px solid ${th.bdr}`, overflowX: "auto" }}>
        {PAGE_TABS.map(t => (
          <button key={t.id} onClick={() => setPageTab(t.id)} style={{ flexShrink: 0, padding: "7px 12px", borderRadius: 9, border: "none", background: pageTab === t.id ? "#6366f1" : "transparent", color: pageTab === t.id ? "#fff" : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
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
            <div style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
              <input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} onKeyDown={e => { if (e.key === "Enter" && taskForm.title.trim()) addTask(); }} placeholder="Task title *" style={{ ...inp, marginBottom: 10 }} autoFocus />
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <select value={taskForm.assignee_id} onChange={e => setTaskForm(f => ({ ...f, assignee_id: e.target.value }))} style={{ ...inp, flex: 1 }}>
                  <option value="">Assign to…</option>
                  {pgMems.map(m => { const p = profiles[m.user_id] || { name: "Member" }; return <option key={m.user_id} value={m.user_id}>{p.name}</option>; })}
                </select>
                <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))} style={{ ...inp, flex: 1 }}>
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🔴 High</option>
                </select>
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
          {files.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: th.txt3, fontSize: 13 }}>No files yet.</div>
          ) : files.map(f => {
            const uploader = profiles[f.uploaded_by] || { name: "Member" };
            return (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 12, padding: "12px 16px", marginBottom: 8 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "#6366f118", border: "1px solid #6366f130", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📄</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: th.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: th.txt3, marginTop: 2 }}>{(f.size / 1024).toFixed(1)} KB · {uploader.name} · {ago(new Date(f.created_at).getTime())}</div>
                </div>
                {(f.uploaded_by === me || isFounder) && <button onClick={() => deleteFile(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3, padding: 4 }}><Trash2 size={13} /></button>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MEETINGS ── */}
      {pageTab === "meetings" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: th.txt2, display: "flex", alignItems: "center", gap: 6 }}><Calendar size={14} /> Meetings ({meetings.length})</span>
            <button onClick={() => setShowMtgForm(v => !v)} style={{ display: "flex", alignItems: "center", gap: 5, background: showMtgForm ? th.surf2 : "#6366f1", border: `1px solid ${showMtgForm ? th.bdr : "#6366f1"}`, borderRadius: 10, padding: "7px 14px", color: showMtgForm ? th.txt2 : "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {showMtgForm ? <><X size={13} /> Cancel</> : <><PlusCircle size={13} /> Book</>}
            </button>
          </div>
          {showMtgForm && (
            <div style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 14, padding: 16, marginBottom: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <input value={mtgForm.title} onChange={e => setMtgForm(f => ({ ...f, title: e.target.value }))} placeholder="Meeting title *" style={inp} />
              <div style={{ display: "flex", gap: 10 }}>
                <input type="date" value={mtgForm.date} onChange={e => setMtgForm(f => ({ ...f, date: e.target.value }))} style={{ ...inp, flex: 1 }} />
                <input type="time" value={mtgForm.time} onChange={e => setMtgForm(f => ({ ...f, time: e.target.value }))} style={{ ...inp, flex: 1 }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[{ id: "google_meet", label: "Google Meet", e: "📹" }, { id: "zoom", label: "Zoom", e: "📷" }].map(p => (
                  <button key={p.id} onClick={() => setMtgForm(f => ({ ...f, platform: p.id }))} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${mtgForm.platform === p.id ? "#6366f1" : th.bdr}`, background: mtgForm.platform === p.id ? "#6366f1" : th.surf2, color: mtgForm.platform === p.id ? "#fff" : th.txt2, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>{p.e} {p.label}</button>
                ))}
              </div>
              <input value={mtgForm.link} onChange={e => setMtgForm(f => ({ ...f, link: e.target.value }))} placeholder="Meeting link (optional)" style={inp} />
              <input value={mtgForm.with_note} onChange={e => setMtgForm(f => ({ ...f, with_note: e.target.value }))} placeholder="With whom? (e.g. John, Sarah)" style={inp} />
              <textarea value={mtgForm.agenda} onChange={e => setMtgForm(f => ({ ...f, agenda: e.target.value }))} placeholder="Agenda (optional)" rows={2} style={{ ...inp, resize: "vertical" }} />
              <button onClick={bookMeeting} disabled={!mtgForm.title.trim() || !mtgForm.date || !mtgForm.time} style={{ padding: "10px", background: (mtgForm.title.trim() && mtgForm.date && mtgForm.time) ? "#6366f1" : th.surf2, border: "none", borderRadius: 10, cursor: "pointer", color: (mtgForm.title.trim() && mtgForm.date && mtgForm.time) ? "#fff" : th.txt3, fontWeight: 700, fontSize: 13 }}>Book Meeting</button>
            </div>
          )}
          {meetings.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: th.txt3, fontSize: 13 }}>No meetings scheduled.</div>
          ) : meetings.map(mtg => {
            const booker = profiles?.[mtg.created_by] || { name: "Unknown" };
            return (
              <div key={mtg.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 12, padding: "12px 16px", marginBottom: 8 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "#6366f118", border: "1px solid #6366f130", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📅</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: th.txt }}>{mtg.title}</div>
                  <div style={{ fontSize: 12, color: th.txt3, marginTop: 2 }}>{mtg.meeting_date} · {mtg.meeting_time} · {mtg.platform === "zoom" ? "📷 Zoom" : "📹 Google Meet"}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: th.txt3 }}>Booked by</span>
                    <div onClick={() => setViewingProf(mtg.created_by)} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}><Av profile={booker} size={16} /><span style={{ fontSize: 11, fontWeight: 600, color: th.txt2 }}>{booker.name}</span></div>
                    {mtg.with_note && <><span style={{ fontSize: 11, color: th.txt3 }}>· with</span><span style={{ fontSize: 11, fontWeight: 600, color: "#6366f1" }}>{mtg.with_note}</span></>}
                  </div>
                  {mtg.link && <a href={mtg.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#6366f1", fontWeight: 600, display: "inline-block", marginTop: 4 }}>Join link →</a>}
                  {mtg.agenda && <p style={{ fontSize: 12, color: th.txt2, margin: "4px 0 0", fontStyle: "italic" }}>{mtg.agenda}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
          <div style={{ fontWeight: 700, fontSize: 14, color: th.txt2, marginBottom: 14 }}>👥 Members ({pgMems.length})</div>
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
                {isFounder ? (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {PAGE_MEMBER_ROLES.map(r => (
                      <button key={r.id} onClick={() => setMemberRole(pm.user_id, r.id)} style={{ background: role === r.id ? `${r.c}22` : th.surf2, border: `1px solid ${role === r.id ? r.c + "50" : th.bdr}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer", color: role === r.id ? r.c : th.txt3, fontSize: 11, fontWeight: role === r.id ? 700 : 500 }}>{r.e} {r.label}</button>
                    ))}
                  </div>
                ) : (
                  <span style={{ background: `${ri.c}18`, color: ri.c, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8, border: `1px solid ${ri.c}30` }}>{ri.e} {ri.label}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
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
    const payload = { page_id: bookingFor, startup_id: startup.id, created_by: me, title: form.title.trim(), meeting_date: form.date, meeting_time: form.time, platform: form.platform, link: form.link.trim(), agenda: form.agenda.trim(), with_note: form.with_note.trim() };
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
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "#3b82f618", border: "1px solid #3b82f630", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>📅</div>
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

  if (activePage) return <PageChatView page={activePage} startup={startup} me={me} profiles={profiles} pageMembers={pageMembers} allMembers={members} isFounder={false} dk={dk} onBack={() => setActivePage(null)} />;

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
                        <button onClick={() => setActivePage(pg)} style={{ display: "flex", alignItems: "center", gap: 5, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 8, padding: "7px 14px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}><LogIn size={12} /> Enter</button>
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
  const [viewingProfile, setViewingProfile] = useState(null);
  const [memberViewMode, setMemberViewMode] = useState("all"); // "all" | "bypage"
  const [memberRoles, setMemberRoles] = useState(() => ls.get(`rs_m_roles_${startup.id}`, {}));
  const [expandedMember, setExpandedMember] = useState(null);

  // Per-page requests/access (localStorage)
  const PG_REQ_KEY = `rs_pg_req_${startup.id}`;
  const PG_MEM_KEY = `rs_pg_mem_${startup.id}`;
  const [pageReqs, setPageReqs] = useState(() => ls.get(PG_REQ_KEY, []));
  const [pageMembers, setPageMembers] = useState(() => ls.get(PG_MEM_KEY, []));

  const pendingPageReqs = pageReqs.filter(r => r.status === "pending");

  const assignMemberRole = (userId, roleId) => {
    const existing = memberRoles[userId] || [];
    const updated = existing.includes(roleId) ? existing.filter(r => r !== roleId) : [...existing, roleId];
    const newRoles = { ...memberRoles, [userId]: updated };
    setMemberRoles(newRoles); ls.set(`rs_m_roles_${startup.id}`, newRoles);
  };

  const assignMemberPage = (userId, pageId) => {
    const alreadyHas = pageMembers.find(m => m.page_id === pageId && m.user_id === userId);
    let mems;
    if (alreadyHas) { mems = pageMembers.filter(m => !(m.page_id === pageId && m.user_id === userId)); }
    else { mems = [...pageMembers, { page_id: pageId, user_id: userId }]; }
    setPageMembers(mems); ls.set(PG_MEM_KEY, mems);
  };

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
    // Check user still exists
    if (!profiles[req.user_id]) {
      const cleaned = pageReqs.filter(r => r.id !== req.id);
      setPageReqs(cleaned); ls.set(PG_REQ_KEY, cleaned);
      addNotif?.({ type: "error", msg: "User no longer exists — request removed." });
      return;
    }
    // Avoid duplicates
    const alreadyMember = pageMembers.find(m => m.page_id === req.page_id && m.user_id === req.user_id);
    const updReqs = pageReqs.filter(r => r.id !== req.id);
    setPageReqs(updReqs); ls.set(PG_REQ_KEY, updReqs);
    if (!alreadyMember) {
      const mems = [...pageMembers, { page_id: req.page_id, user_id: req.user_id }];
      setPageMembers(mems); ls.set(PG_MEM_KEY, mems);
    }
    addNotif?.({ type: "success", msg: "Page access granted!" });
  };

  const rejectPageReq = (req) => {
    const updReqs = pageReqs.filter(r => r.id !== req.id);
    setPageReqs(updReqs); ls.set(PG_REQ_KEY, updReqs);
    addNotif?.({ type: "info", msg: "Request rejected." });
  };

  const removeMember = async (userId) => {
    await db.del("rs_page_access", `startup_id=eq.${startup.id}&user_id=eq.${userId}`);
    setMembers(ms => ms.filter(m => m.user_id !== userId));
    // Remove their page memberships and pending requests
    const cleanedMems = pageMembers.filter(m => m.user_id !== userId);
    setPageMembers(cleanedMems); ls.set(PG_MEM_KEY, cleanedMems);
    const cleanedReqs = pageReqs.filter(r => r.user_id !== userId);
    setPageReqs(cleanedReqs); ls.set(PG_REQ_KEY, cleanedReqs);
    addNotif?.({ type: "success", msg: "Member removed." });
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
    const saved = await db.post("rs_startup_pages", { startup_id: startup.id, name: newPageName.trim(), description: pt.desc, type_id: newPageType, created_by: me });
    const pg = saved || { id: `local_pg_${Date.now()}`, startup_id: startup.id, name: newPageName.trim(), description: pt.desc, type_id: newPageType, created_by: me, created_at: new Date().toISOString() };
    setPages(ps => [...ps, pg]);
    setNewPageName(""); setShowAddPage(false);
  };

  const deletePage = async (id) => {
    await db.del("rs_startup_pages", `id=eq.${id}`);
    setPages(ps => ps.filter(p => p.id !== id));
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
    { id: "pages", label: "Pages" },
    { id: "members", label: "Members" },
    { id: "meetings", label: "Meetings" },
    { id: "updates", label: "Updates" },
    { id: "feedback", label: "Feedback" },
  ];

  const inp = { background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box", color: th.txt, fontFamily: "inherit" };

  if (activePage) return <PageChatView page={activePage} startup={startup} me={me} profiles={profiles} pageMembers={pageMembers} allMembers={members} isFounder={true} dk={dk} onBack={() => setActivePage(null)} />;

  return (
    <div style={{ animation: "fadeUp 0.3s ease both" }}>
      {viewingProfile && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9998, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "16px", overflowY: "auto" }} onClick={() => setViewingProfile(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 680, background: dk ? "rgba(8,15,30,0.98)" : "#f8fafc", backdropFilter: "blur(24px)", border: `1px solid ${T(dk).bdr}`, borderRadius: 22, padding: "20px", marginTop: 16, marginBottom: 16, animation: "fadeUp 0.22s ease both" }}>
            <ProfileView uid={viewingProfile} me={me} dk={dk} bals={bals} profiles={profiles} setBals={() => {}} onBack={() => setViewingProfile(null)} onMessage={() => {}} addNotif={addNotif} />
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
              {requests.filter(r => profiles[r.user_id]).length === 0 ? (
                <Card dk={dk} anim={false}><div style={{ textAlign: "center", padding: "16px 0", color: th.txt3, fontSize: 13 }}>📬 No join requests yet.</div></Card>
              ) : requests.filter(r => profiles[r.user_id]).map(req => {
                const prof = profiles[req.user_id] || { name: "Applicant" };
                return (
                  <Card dk={dk} key={req.id} anim={false}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div onClick={() => setViewingProfile(req.user_id)} style={{ cursor: "pointer", flexShrink: 0 }} title="View profile">
                        <Av profile={prof} size={44} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
                          <div onClick={() => setViewingProfile(req.user_id)} style={{ cursor: "pointer" }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: th.txt, textDecoration: "underline", textDecorationColor: "transparent" }} onMouseEnter={e => e.currentTarget.style.textDecorationColor = th.txt} onMouseLeave={e => e.currentTarget.style.textDecorationColor = "transparent"}>{prof.name}</div>
                            <div style={{ fontSize: 12, color: th.txt3 }}>@{prof.handle || req.user_id.slice(0, 8)} · tap to view full profile</div>
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
              {pageReqs.filter(r => profiles[r.user_id] && pages.find(p => p.id === r.page_id)).length > 0 && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: th.txt3, marginTop: 20, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Page Access Requests</div>
                  {pageReqs.filter(r => profiles[r.user_id] && pages.find(p => p.id === r.page_id)).map(req => {
                    const prof = profiles[req.user_id] || { name: "User" };
                    const pg = pages.find(p => p.id === req.page_id);
                    const pt = PAGE_TYPES.find(p => p.id === pg?.type_id) || PAGE_TYPES[0];
                    return (
                      <Card dk={dk} key={req.id} anim={false}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <div onClick={() => setViewingProfile(req.user_id)} style={{ cursor: "pointer", flexShrink: 0 }} title="View profile">
                            <Av profile={prof} size={40} />
                          </div>
                          <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setViewingProfile(req.user_id)}>
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
                const pgMems = pageMembers.filter(m => m.page_id === pg.id);
                const pgPendingReqs = pageReqs.filter(r => r.page_id === pg.id && r.status === "pending");
                const creatorProf = profiles[pg.created_by] || null;
                const isExpanded = expandedMember === `pg_${pg.id}`;
                return (
                  <Card dk={dk} key={pg.id} anim={false} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1, minWidth: 0 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${pt.c}18`, border: `1px solid ${pt.c}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{pt.e}</div>
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
                  const ROLE_OPTS = [{ id: "developer", e: "⚡", c: "#3b82f6", label: "Dev" }, { id: "designer", e: "🎨", c: "#ec4899", label: "Design" }, { id: "marketer", e: "📢", c: "#f97316", label: "Marketing" }, { id: "advisor", e: "🎯", c: "#8b5cf6", label: "Advisor" }, { id: "investor", e: "💰", c: "#10b981", label: "Investor" }];
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
                            {memberPages.map(pg => { const pt = PAGE_TYPES.find(p => p.id === pg.type_id) || PAGE_TYPES[0]; return <span key={pg.id} style={{ background: `${pt.c}18`, color: pt.c, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 6, border: `1px solid ${pt.c}30` }}>{pt.e} {pg.name}</span>; })}
                            {assignedRoles.map(r => { const ro = ROLE_OPTS.find(o => o.id === r); return ro ? <span key={r} style={{ background: `${ro.c}18`, color: ro.c, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 6, border: `1px solid ${ro.c}30` }}>{ro.e} {ro.label}</span> : null; })}
                          </div>
                          {/* Role assignment UI */}
                          {isExpandedM && (
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${th.bdr}` }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: th.txt3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Assign Roles</div>
                              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                                {ROLE_OPTS.map(ro => {
                                  const active = assignedRoles.includes(ro.id);
                                  return <button key={ro.id} onClick={() => assignMemberRole(m.user_id, ro.id)} style={{ background: active ? `${ro.c}20` : th.surf2, border: `1px solid ${active ? ro.c + "50" : th.bdr}`, borderRadius: 7, padding: "4px 9px", cursor: "pointer", color: active ? ro.c : th.txt3, fontSize: 11, fontWeight: active ? 700 : 500 }}>{ro.e} {ro.label}</button>;
                                })}
                              </div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: th.txt3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Page Access</div>
                              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                {pages.map(pg => {
                                  const pt = PAGE_TYPES.find(p => p.id === pg.type_id) || PAGE_TYPES[0];
                                  const hasPg = pageMembers.find(pm => pm.user_id === m.user_id && pm.page_id === pg.id);
                                  return <button key={pg.id} onClick={() => assignMemberPage(m.user_id, pg.id)} style={{ background: hasPg ? `${pt.c}20` : th.surf2, border: `1px solid ${hasPg ? pt.c + "50" : th.bdr}`, borderRadius: 7, padding: "4px 9px", cursor: "pointer", color: hasPg ? pt.c : th.txt3, fontSize: 11, fontWeight: hasPg ? 700 : 500 }}>{pt.e} {pg.name}</button>;
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
                  <div style={{ textAlign: "center", padding: 40, color: th.txt3 }}><div style={{ fontSize: 32 }}>📄</div><p>No pages yet.</p></div>
                ) : pages.map(pg => {
                  const pt = PAGE_TYPES.find(p => p.id === pg.type_id) || PAGE_TYPES[0];
                  const pgMems = pageMembers.filter(pm => pm.page_id === pg.id);
                  return (
                    <div key={pg.id} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${pt.c}18`, border: `1px solid ${pt.c}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{pt.e}</div>
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

          {tab === "meetings" && <MeetingsTab pages={pages} startup={startup} me={me} profiles={profiles} members={members} dk={dk} />}

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
