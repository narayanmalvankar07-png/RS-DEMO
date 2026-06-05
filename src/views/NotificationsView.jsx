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
      // Filter out self-notifications (where the actor is the same as the recipient)
      const validNotifs = notifs.filter(n => {
        if (n.type === 'token' || n.type === 'system') return true;
        const actorId = n.profile_id || n.requester_uid || n.target_uid;
        // Only filter out if we KNOW the actor is the same as the recipient
        if (actorId && actorId === n.uid) return false;
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
    const bg = dk ? "rgba(30, 41, 59, 0.95)" : "rgba(255, 255, 255, 0.95)";
    const bdr = dk ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.08)";
    const iconStyle = { 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      width: 22, 
      height: 22, 
      borderRadius: "50%", 
      background: bg, 
      boxShadow: dk ? "0 4px 10px rgba(0,0,0,0.4)" : "0 4px 10px rgba(99,102,241,0.15)", 
      border: `1px solid ${bdr}` 
    };

    switch (type) {
      case "like": return <div style={iconStyle}><Heart size={12} fill="#ef4444" color="#ef4444" /></div>;
      case "comment": return <div style={iconStyle}><MessageCircle size={12} fill="#3b82f6" color="#3b82f6" /></div>;
      case "align_request": return <div style={iconStyle}><UserPlus size={12} color="#8b5cf6" /></div>;
      case "repost": return <div style={iconStyle}><Repeat size={12} color="#10b981" /></div>;
      case "quote": return <div style={iconStyle}><Quote size={12} color="#f59e0b" /></div>;
      default: return <div style={iconStyle}><Bell size={12} color="#6366f1" /></div>;
    }
  };

  const getFallbackProfile = (n) => {
    if (n.prof) return n.prof;
    if (n.type === 'token' || n.type === 'system') {
      return { name: "System", hue: "#6366f1", avatar: null };
    }
    return { name: "A Member", hue: "#64748b", avatar: null };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", animation: "fadeUp 0.3s cubic-bezier(0.22,1,0.36,1)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, padding: "0 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: th.txt, letterSpacing: "-0.5px", margin: 0 }}>Notifications</h2>
          {extNotifs.filter(n => !n.read).length > 0 && (
            <span style={{ 
              background: "#6366f1", 
              color: "#fff", 
              fontSize: 11, 
              fontWeight: 700, 
              padding: "2px 8px", 
              borderRadius: 20, 
              boxShadow: "0 2px 10px rgba(99,102,241,0.3)" 
            }}>
              {extNotifs.filter(n => !n.read).length} new
            </span>
          )}
        </div>
        {extNotifs.some(n => !n.read) && (
          <button 
            onClick={markAllRead} 
            style={{ 
              background: dk ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)", 
              border: "none", 
              color: "#6366f1", 
              fontSize: 13, 
              fontWeight: 700, 
              cursor: "pointer",
              padding: "6px 14px",
              borderRadius: 20,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#6366f1";
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.transform = "scale(1.03)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = dk ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)";
              e.currentTarget.style.color = "#6366f1";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {extNotifs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 40px", color: th.txt3, background: th.surf, borderRadius: 24, border: `1px dashed ${th.bdr}` }}>
            <div style={{ 
              width: 64, 
              height: 64, 
              borderRadius: "50%", 
              background: dk ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.06)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              margin: "0 auto 16px" 
            }}>
              <Bell size={28} color="#6366f1" style={{ opacity: 0.8 }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: th.txt, margin: "0 0 4px 0" }}>All caught up!</h3>
            <p style={{ fontSize: 13, color: th.txt3, margin: 0 }}>You don't have any notifications right now.</p>
          </div>
        ) : (
          extNotifs.map((n) => {
            const isUnread = !n.read;
            const actorProfile = getFallbackProfile(n);
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  display: "flex", 
                  alignItems: "flex-start", 
                  gap: 16,
                  padding: "18px 20px",
                  borderRadius: 20,
                  background: isUnread 
                    ? (dk ? "rgba(99,102,241,0.08)" : "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(99,102,241,0.02))") 
                    : th.surf,
                  border: `1px solid ${isUnread ? "rgba(99,102,241,0.25)" : th.bdr}`,
                  borderLeft: isUnread ? "4px solid #6366f1" : undefined,
                  boxShadow: isUnread
                    ? (dk ? "0 4px 20px -2px rgba(99,102,241,0.12)" : "0 4px 20px -2px rgba(99,102,241,0.06)")
                    : "none",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = dk 
                    ? "0 6px 24px -2px rgba(0,0,0,0.4)" 
                    : "0 6px 24px -2px rgba(99,102,241,0.12)";
                  if (!isUnread) {
                    e.currentTarget.style.background = th.surf2;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = isUnread
                    ? (dk ? "0 4px 20px -2px rgba(99,102,241,0.12)" : "0 4px 20px -2px rgba(99,102,241,0.06)")
                    : "none";
                  if (!isUnread) {
                    e.currentTarget.style.background = th.surf;
                  }
                }}
              >
                <div style={{ position: "relative", flexShrink: 0, marginTop: 2 }}>
                  <Av profile={actorProfile} size={46} />
                  <div style={{ position: "absolute", bottom: -4, right: -4 }}>
                    {getIcon(n.type)}
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 14, color: th.txt, lineHeight: 1.4, display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px 8px" }}>
                    <span style={{ fontWeight: 700, color: th.txt }}>{actorProfile.name}</span>
                    <span style={{ color: isUnread ? th.txt : th.txt2 }}>
                      {n.type === "like" ? "liked your signal." :
                       n.type === "comment" ? (n.comment_text ? "commented on your signal:" : "commented on your signal.") :
                       n.type === "align_request" ? "sent you an align request." :
                       n.type === "align_accept" ? "accepted your align request." :
                       n.type === "repost" ? "reposted your signal." :
                       n.type === "quote" ? "quote-reposted your signal." :
                       n.msg}
                    </span>
                    <span style={{ fontSize: 11, color: th.txt3, whiteSpace: "nowrap" }}>
                      • {new Date(n.ts || Date.now()).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {isUnread && (
                      <span style={{ 
                        background: "linear-gradient(135deg, #6366f1, #4f46e5)", 
                        color: "#fff", 
                        fontSize: 8, 
                        fontWeight: 800, 
                        padding: "1px 5px", 
                        borderRadius: 4, 
                        textTransform: "uppercase", 
                        letterSpacing: "0.5px",
                        boxShadow: "0 2px 6px rgba(99,102,241,0.25)"
                      }}>
                        New
                      </span>
                    )}
                  </div>

                  {n.type === "comment" && n.comment_text && (
                    <div style={{
                      marginTop: 8,
                      padding: "10px 14px",
                      borderRadius: 14,
                      background: dk ? "rgba(99, 102, 241, 0.06)" : "rgba(99, 102, 241, 0.03)",
                      borderLeft: "3px solid #6366f1",
                      fontSize: 13,
                      color: th.txt2,
                      fontStyle: "italic",
                      lineHeight: 1.45,
                      boxShadow: "inset 0 1px 2px rgba(0,0,0,0.01)"
                    }}>
                      "{n.comment_text}"
                    </div>
                  )}
                </div>

                {n.post && (n.post.media?.length > 0 || n.post.text) && (
                  <div className="rs-notif-preview" style={{
                    width: 130,
                    height: 56,
                    borderRadius: 12,
                    overflow: "hidden",
                    background: dk ? "rgba(15, 23, 42, 0.3)" : "rgba(255, 255, 255, 0.6)",
                    backdropFilter: "blur(6px)",
                    boxShadow: dk ? "none" : "0 2px 8px rgba(99,102,241,0.03)",
                    border: `1px solid ${th.bdr}`,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: 8,
                    padding: "4px 8px",
                    boxSizing: "border-box",
                    marginLeft: 12,
                  }}>
                    {n.post.media?.length > 0 ? (
                      <img src={typeof n.post.media[0] === 'string' ? n.post.media[0] : n.post.media[0]?.url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                    ) : null}
                    <div style={{
                      flex: 1,
                      minWidth: 0,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}>
                      <div style={{
                        fontSize: 8,
                        fontWeight: 800,
                        color: "#6366f1",
                        textTransform: "uppercase",
                        letterSpacing: "0.8px",
                        marginBottom: 2,
                      }}>
                        Your Signal
                      </div>
                      <div style={{
                        fontSize: 10,
                        fontWeight: 500,
                        color: th.txt2,
                        lineHeight: 1.3,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}>
                        {n.post.text}
                      </div>
                    </div>
                  </div>
                )}

                {n.type === "align_request" && (
                  <div style={{ display: "flex", alignItems: "center", height: 44, marginLeft: 8 }}>
                    <button style={{ 
                      background: "#6366f1", 
                      color: "#fff", 
                      border: "none", 
                      borderRadius: 10, 
                      padding: "8px 16px", 
                      fontSize: 13, 
                      fontWeight: 700, 
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(99,102,241,0.25)",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.05)";
                      e.currentTarget.style.background = "#4f46e5";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.background = "#6366f1";
                    }}
                    >
                      View
                    </button>
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
