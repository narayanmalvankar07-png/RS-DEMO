import { useState, useEffect } from "react";
import { Bell, Heart, MessageCircle, UserPlus, Quote, Repeat } from "lucide-react";
import { T } from "../config/constants";
import { db } from "../services/supabase";
import Av from "../components/ui/Av";

export default function NotificationsView({ notifs, setNotifs, me, dk, profiles, onProfile, onSelect }) {
  const th = T(dk);
  const [extNotifs, setExtNotifs] = useState([]);

  useEffect(() => {
    let mounted = true;
    const loadContext = async () => {
      // Filter out permanently corrupted old notifications that are missing an actor ID or have the self-like bug
      const validNotifs = notifs.filter(n => {
        if (n.type === 'token' || n.type === 'system') return true;
        const actorId = n.profile_id || n.requester_uid || n.target_uid;
        if (!actorId) return false;
        if (actorId === n.uid) return false;
        return true;
      });
      
      const mapped = await Promise.all(
        validNotifs.map(async (n) => {
          let post = null;
          let profId = n.profile_id || n.requester_uid || n.target_uid;
          let realCommentText = n.comment_text || null;

          if (n.post_id) {
            try {
              const rows = await db.get("rs_posts", `id=eq.${n.post_id}`);
              if (rows?.length) post = rows[0];
            } catch {}
          }
          
          if (n.type === "comment" && n.comment_id && !realCommentText) {
             try {
               const crow = await db.get("rs_comments", `id=eq.${n.comment_id}`);
               if (crow?.length) realCommentText = crow[0].text;
             } catch {}
          }
          
          let prof = profiles[profId] || null;

          if (n.type === "align_request" && !prof) {
            try {
              const pending = await db.get("rs_align_requests", `target_uid=eq.${me}&status=eq.pending&order=created_at.desc&limit=1`);
              if (pending?.length) prof = profiles[pending[0].requester_uid];
            } catch {}
          } else if (n.type === "align_accept" && !prof) {
            try {
              const accepted = await db.get("rs_align_requests", `requester_uid=eq.${me}&status=eq.accepted&order=created_at.desc&limit=1`);
              if (accepted?.length) prof = profiles[accepted[0].target_uid];
            } catch {}
          }

          return { ...n, post, prof, comment_text: realCommentText, profile_id: profId };
        })
      );
      if (mounted) setExtNotifs(mapped);
    };
    loadContext();
    return () => { mounted = false; };
  }, [notifs, profiles, me]);

  const markAllRead = () => {
    setNotifs((ns) => ns.map((n) => ({ ...n, read: true })));
    extNotifs.forEach(n => {
      if (!n.read && n.id !== "n0") db.patch("rs_notifications", `id=eq.${n.id}`, { read: true }).catch(() => {});
    });
  };

  const handleClick = (n) => {
    setNotifs((ns) => ns.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    if (n.id && n.id !== "n0") {
      db.patch("rs_notifications", `id=eq.${n.id}`, { read: true }).catch(() => {});
    }

    if (onSelect) {
      onSelect(n);
    } else {
      if (n.type === "align_request" && n.prof) {
        onProfile(n.prof.id);
      } else if (n.post_id || n.type === "like" || n.type === "comment" || n.type === "repost" || n.type === "quote") {
        if (n.prof) onProfile(n.prof.id);
      }
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "like": return <Heart size={16} fill="#ef4444" color="#ef4444" />;
      case "comment": return <MessageCircle size={16} fill="#3b82f6" color="#3b82f6" />;
      case "align_request": return <UserPlus size={16} color="#8b5cf6" />;
      case "repost": return <Repeat size={16} color="#10b981" />;
      case "quote": return <Quote size={16} color="#f59e0b" />;
      default: return <Bell size={16} color={th.txt2} />;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", animation: "fadeUp 0.3s cubic-bezier(0.22,1,0.36,1)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, padding: "0 12px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: th.txt }}>Notifications</h2>
        {extNotifs.some(n => !n.read) && (
          <button onClick={markAllRead} style={{ background: "transparent", border: "none", color: "#6366f1", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Mark all read
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {extNotifs.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: th.txt3 }}>
            <Bell size={32} style={{ margin: "0 auto 10px", opacity: 0.5 }} />
            <p>No notifications yet</p>
          </div>
        ) : (
          extNotifs.map((n, i) => {
            const isUnread = !n.read;
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: 16,
                  borderRadius: 16,
                  background: isUnread ? (dk ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.06)") : th.surf,
                  border: `1px solid ${isUnread ? "#6366f150" : th.bdr}`,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <Av profile={n.prof || {}} size={44} />
                  <div style={{ position: "absolute", bottom: -4, right: -4, background: th.surf, borderRadius: "50%", padding: 2 }}>
                    {getIcon(n.type)}
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: th.txt, lineHeight: 1.4 }}>
                    {n.prof ? (
                      <span style={{ fontWeight: 700, marginRight: 4 }}>{n.prof.name}</span>
                    ) : null}
                    <span style={{ color: isUnread ? th.txt : th.txt2 }}>
                      {n.type === "like" ? "liked your post." :
                       n.type === "comment" ? `commented: "${n.comment_text || 'nice!'}"` :
                       n.type === "align_request" ? "sent you an align request." :
                       n.type === "repost" ? "reposted your signal." :
                       n.type === "quote" ? "quote-reposted your signal." :
                       n.msg}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: th.txt3, marginTop: 4 }}>
                    {new Date(n.ts || Date.now()).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>

                {n.post && (n.post.media?.length > 0 || n.post.text) && (
                  <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", background: th.surf2, border: `1px solid ${th.bdr}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {n.post.media?.length > 0 ? (
                      <img src={n.post.media[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 10, color: th.txt2, padding: 4, textAlign: "center", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {n.post.text}
                      </span>
                    )}
                  </div>
                )}
                {n.type === "align_request" && (
                  <div style={{ display: "flex", alignItems: "center", height: 44 }}>
                    <button style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>View</button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
