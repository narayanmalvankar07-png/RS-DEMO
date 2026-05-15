import { useEffect, useState, useCallback } from "react";
import { Send, Search, Edit, X, MessageSquareOff, Users, Plus } from "lucide-react";
import { T } from "../config/constants.js";
import Av from "../components/ui/Av.jsx";
import Card from "../components/ui/Card.jsx";
import Conversation from "../components/shared/Conversation.tsx";

export default function MessengerView({ dk, profiles, me, initUid, onProfile }) {
  const th = T(dk);

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState("");
  const [showNewMsg, setShowNewMsg] = useState(false);
  const [newMsgSearch, setNewMsgSearch] = useState("");
  const [creating, setCreating] = useState(false);

  // ── Fetch all conversations for this user ──────────────────────────
  const loadConversations = useCallback(async () => {
    if (!me) return;
    try {
      const res = await fetch("/api/conversations", {
        headers: { "x-user-id": me },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data || []);
      }
    } catch (e) {
      console.error("Failed to load conversations:", e);
    } finally {
      setLoading(false);
    }
  }, [me]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── If initUid provided, find or create a 1-on-1 conversation ─────
  useEffect(() => {
    if (!initUid || !me || initUid === me) return;
    (async () => {
      // Check if a conversation already exists
      const res = await fetch(`/api/conversations/with/${initUid}`, {
        headers: { "x-user-id": me },
      });
      if (res.ok) {
        const existing = await res.json();
        if (existing?.id) {
          setActiveId(existing.id);
          // Make sure it's in the list
          setConversations(prev =>
            prev.find(c => c.id === existing.id) ? prev : [existing, ...prev]
          );
          return;
        }
      }
      // Create a new 1-on-1
      const createRes = await fetch("/api/conversations", {
        method: "POST",
        headers: { "x-user-id": me, "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: initUid }),
      });
      if (createRes.ok) {
        const newConv = await createRes.json();
        setConversations(prev => [newConv, ...prev]);
        setActiveId(newConv.id);
      }
    })();
  }, [initUid, me]);

  // ── Start a new 1-on-1 conversation with a selected user ──────────
  const startConversation = async (targetUid) => {
    if (creating || targetUid === me) return;
    setCreating(true);
    setShowNewMsg(false);
    try {
      const checkRes = await fetch(`/api/conversations/with/${targetUid}`, {
        headers: { "x-user-id": me },
      });
      if (checkRes.ok) {
        const existing = await checkRes.json();
        if (existing?.id) {
          setConversations(prev =>
            prev.find(c => c.id === existing.id) ? prev : [existing, ...prev]
          );
          setActiveId(existing.id);
          return;
        }
      }
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "x-user-id": me, "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: targetUid }),
      });
      if (res.ok) {
        const newConv = await res.json();
        setConversations(prev => [newConv, ...prev]);
        setActiveId(newConv.id);
      }
    } finally {
      setCreating(false);
    }
  };

  // ── Derive data for the active conversation ────────────────────────
  const activeConv = conversations.find(c => c.id === activeId);
  const getParticipants = (conv) =>
    (conv?.rs_conversation_participants || []).map(p => p.user_id);
  const getConvName = (conv) => {
    if (!conv) return "";
    if (conv.is_group) return conv.name || "Group";
    const other = getParticipants(conv).find(uid => uid !== me);
    return profiles[other]?.name || "Unknown";
  };
  const getConvTarget = (conv) =>
    getParticipants(conv).find(uid => uid !== me);

  // ── Filter conversations by search ─────────────────────────────────
  const filteredConvs = conversations.filter(c => {
    const name = getConvName(c).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  // ── Users available to message (from profiles, excluding self) ─────
  const profileList = Object.entries(profiles)
    .filter(([uid]) => uid !== me)
    .filter(([, p]) =>
      !newMsgSearch || (p.name || "").toLowerCase().includes(newMsgSearch.toLowerCase())
    );

  const inp = {
    background: dk ? "rgba(255,255,255,0.06)" : "#f8fafc",
    border: `1px solid ${th.bdr}`,
    borderRadius: 10,
    padding: "9px 14px",
    fontSize: 13,
    outline: "none",
    color: th.txt,
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 18, minHeight: "calc(100vh - 120px)" }}>

      {/* ── Left panel: conversation list ─── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: th.txt }}>Messages</h2>
          <button
            onClick={() => setShowNewMsg(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#6366f1", border: "none", borderRadius: 10, padding: "7px 12px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            data-testid="button-new-message"
          >
            <Edit size={14} /> New
          </button>
        </div>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: th.txt3 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations…"
            style={{ ...inp, paddingLeft: 30 }}
            data-testid="input-search-conversations"
          />
        </div>

        {/* List */}
        <Card dk={dk} style={{ padding: 0, overflow: "hidden", flex: 1 }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: th.txt3, fontSize: 13 }}>Loading…</div>
          ) : filteredConvs.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: th.txt3, fontSize: 13 }}>
              <MessageSquareOff size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
              <div>No conversations yet.</div>
              <div style={{ marginTop: 4, fontSize: 12 }}>Click "New" to start one.</div>
            </div>
          ) : (
            filteredConvs.map(conv => {
              const convName = getConvName(conv);
              const targetUid = getConvTarget(conv);
              const targetProfile = profiles[targetUid] || { name: convName };
              const isActive = conv.id === activeId;
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveId(conv.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    padding: "13px 16px",
                    background: isActive
                      ? (dk ? "rgba(99,102,241,0.18)" : "rgba(99,102,241,0.1)")
                      : "transparent",
                    color: th.txt,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    cursor: "pointer",
                    borderLeft: isActive ? "3px solid #6366f1" : "3px solid transparent",
                    transition: "background 0.15s",
                  }}
                  data-testid={`button-conversation-${conv.id}`}
                >
                  {conv.is_group
                    ? <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}><Users size={18} color="#fff" /></div>
                    : <Av profile={targetProfile} size={38} />
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: th.txt, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{convName}</div>
                    <div style={{ fontSize: 12, color: th.txt3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {conv.is_group ? `${getParticipants(conv).length} members` : "Tap to open chat"}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </Card>
      </div>

      {/* ── Right panel: active chat ───────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {!activeConv ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: th.txt3, gap: 12, minHeight: 400 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: dk ? "rgba(255,255,255,0.05)" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Send size={28} color={th.txt3} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: th.txt }}>Your Messages</div>
            <div style={{ fontSize: 13, textAlign: "center", maxWidth: 260 }}>Select a conversation or click "New" to start messaging someone.</div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 16, padding: "12px 16px" }}>
              {activeConv.is_group
                ? <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Users size={20} color="#fff" /></div>
                : <button onClick={() => onProfile?.(getConvTarget(activeConv))} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    <Av profile={profiles[getConvTarget(activeConv)] || { name: getConvName(activeConv) }} size={40} />
                  </button>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: th.txt }}>{getConvName(activeConv)}</div>
                <div style={{ fontSize: 12, color: th.txt3 }}>
                  {activeConv.is_group
                    ? `${getParticipants(activeConv).length} members`
                    : "Click name to view profile"}
                </div>
              </div>
            </div>

            {/* Conversation component */}
            <Card dk={dk} style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column" }}>
              <Conversation
                key={activeConv.id}
                conversationId={activeConv.id}
                me={me}
                profiles={profiles}
                participants={getParticipants(activeConv)}
                dk={dk}
                name={getConvName(activeConv)}
                isGroup={activeConv.is_group}
              />
            </Card>
          </>
        )}
      </div>

      {/* ── New message modal ──────────────── */}
      {showNewMsg && (
        <div
          onClick={() => setShowNewMsg(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: dk ? "rgba(13,20,38,0.98)" : "#fff", backdropFilter: "blur(20px)", border: `1px solid ${th.bdr}`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 380, animation: "fadeUp 0.2s ease both" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: th.txt }}>New Message</div>
              <button onClick={() => setShowNewMsg(false)} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3 }}><X size={18} /></button>
            </div>
            <input
              value={newMsgSearch}
              onChange={e => setNewMsgSearch(e.target.value)}
              placeholder="Search people…"
              autoFocus
              style={{ ...inp, marginBottom: 12 }}
              data-testid="input-search-new-message"
            />
            <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
              {profileList.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: th.txt3, fontSize: 13 }}>No users found.</div>
              ) : profileList.map(([uid, p]) => (
                <button
                  key={uid}
                  onClick={() => startConversation(uid)}
                  disabled={creating}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "transparent", border: "none", borderRadius: 12, cursor: "pointer", textAlign: "left", width: "100%", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = dk ? "rgba(255,255,255,0.06)" : "#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  data-testid={`button-start-chat-${uid}`}
                >
                  <Av profile={p} size={38} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: th.txt }}>{p.name || "User"}</div>
                    {p.handle && <div style={{ fontSize: 12, color: th.txt3 }}>@{p.handle}</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
