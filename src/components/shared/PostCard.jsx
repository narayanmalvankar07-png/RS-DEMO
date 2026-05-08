// src/components/shared/PostCard.jsx
import { useState, useRef, useEffect } from "react";
import { Heart, MessageCircle, Repeat2, Share2, Bookmark, ChevronLeft, ChevronRight, Mic, Send, MoreHorizontal, Pencil, Trash2, Check, X, Link, Flag } from "lucide-react";
import { T, ROLES } from '../../config/constants.js';
import { ago, fmt } from '../../utils/helpers.js';
import Av from '../ui/Av.jsx';
import SGN from '../ui/SGN.jsx';
import Card from '../ui/Card.jsx';
import ShareModal from './ShareModal.jsx';
import QuoteRepostModal from './QuoteRepostModal.jsx';

function PostCard({ post, me, onLike, onRepost, onQuoteRepost, onComment, onBookmark, onDelete, onEdit, dk, onProfile, bals, profiles, onTag, bookmarks = [] }) {
  const th = T(dk);
  const [showCmt, setShowCmt]         = useState(false);
  const [cmt, setCmt]                 = useState("");
  const [mediaIdx, setMediaIdx]       = useState(0);
  const [showShare, setShowShare]     = useState(false);
  const [showRepostMenu, setShowRepostMenu] = useState(false);
  const [showMenu, setShowMenu]       = useState(false);
  const [editing, setEditing]         = useState(false);
  const [editText, setEditText]       = useState(post.text || "");
  const [editError, setEditError]     = useState("");
  const [copied, setCopied]           = useState(false);
  const menuRef = useRef(null);

  const auth       = profiles[post.uid] || { name: "RightSignal User", hue: "#6b7280" };
  const bal        = bals[post.uid] ?? 0;
  const mediaItems = post.media || [];
  const isBookmarked = bookmarks.includes(post.id);
  const isOwn      = post.uid === me;
  const canEdit    = Date.now() - post.ts < 5 * 60 * 1000;

  useEffect(() => {
    if (!showMenu) return;
    const handle = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showMenu]);

  const submit = () => { if (cmt.trim()) { onComment(post.id, cmt); setCmt(""); setShowCmt(false); } };

  const handleEditClick = () => {
    if (!canEdit) {
      setEditError("Posts can only be edited within 5 minutes of posting.");
      setTimeout(() => setEditError(""), 3500);
      setShowMenu(false); return;
    }
    setEditing(true); setShowMenu(false);
  };

  const saveEdit = () => {
    if (editText.trim()) onEdit?.(post.id, editText.trim());
    setEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm("Delete this post? This cannot be undone.")) {
      onDelete?.(post.id); setShowMenu(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}?post=${post.id}`);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch {}
    setShowMenu(false);
  };

  const menuItems = isOwn
    ? [
        { icon: Pencil, label: "Edit post", action: handleEditClick, color: th.txt2 },
        { icon: Trash2, label: "Delete post", action: handleDelete, color: "#ef4444" },
        { icon: Link,   label: copied ? "Copied!" : "Copy link", action: copyLink, color: th.txt2 },
      ]
    : [
        { icon: Flag, label: "Report post",  action: () => { alert("Post reported. Thank you."); setShowMenu(false); }, color: "#f59e0b" },
        { icon: Link, label: copied ? "Copied!" : "Copy link", action: copyLink, color: th.txt2 },
      ];

  return (
    <>
      {showShare && <ShareModal post={post} onClose={() => setShowShare(false)} dk={dk} />}
      {showRepostMenu && (
        <QuoteRepostModal
          post={post} me={me} myProfile={profiles[me]} profiles={profiles}
          onSimpleRepost={onRepost} onQuotePost={onQuoteRepost}
          onClose={() => setShowRepostMenu(false)} dk={dk}
        />
      )}
      <Card dk={dk}>
        {post.reposted_by && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: th.txt3, marginBottom: 8 }}>
            <Repeat2 size={12} />
            <span>{profiles[post.reposted_by]?.name || "Someone"} reposted</span>
            {post.quote_text && <span style={{ color: th.txt2 }}>with comment</span>}
          </div>
        )}
        {post.quote_text && (
          <div style={{ background: "linear-gradient(135deg,#3b82f610,#8b5cf610)", border: "1px solid #3b82f630", borderRadius: 10, padding: "8px 12px", marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 13, color: th.txt, lineHeight: 1.5, fontStyle: "italic" }}>"{post.quote_text}"</p>
          </div>
        )}
        {editError && (
          <div style={{ background: "#ef444418", border: "1px solid #ef444440", borderRadius: 10, padding: "8px 12px", marginBottom: 10, fontSize: 12, color: "#ef4444", fontWeight: 600, animation: "fadeUp 0.25s ease both" }}>
            {editError}
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <div onClick={() => onProfile(post.uid)} style={{ cursor: "pointer" }}><Av profile={auth} bal={bal} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
              <span onClick={() => onProfile(post.uid)} style={{ fontWeight: 700, fontSize: 14, color: th.txt, cursor: "pointer" }}>{auth.name}</span>
              {auth.verified && <span style={{ color: "#3b82f6", fontSize: 11 }}>✓</span>}
              {auth.system_role && auth.system_role !== "user" && (
                <span style={{ color: th.txt3, fontSize: 10, background: dk ? "rgba(59,130,246,.12)" : "#eff6ff", padding: "1px 6px", borderRadius: 99, fontWeight: 600 }}>{ROLES[auth.system_role] || auth.system_role}</span>
              )}
              {bal > 0 && <SGN n={bal} size="sm" />}
              <span style={{ color: th.txt3, fontSize: 11, marginLeft: "auto" }}>{ago(post.ts)}</span>
              {/* 3-dot menu */}
              <div style={{ position: "relative" }} ref={menuRef}>
                <button onClick={() => setShowMenu(x => !x)} className="rs-icon-btn" style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3, padding: "2px 4px", display: "flex", alignItems: "center", borderRadius: 6 }}>
                  <MoreHorizontal size={15} />
                </button>
                {showMenu && (
                  <div style={{ position: "absolute", top: 24, right: 0, zIndex: 100, background: dk ? "rgba(10,14,30,0.97)" : "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)", border: `1px solid ${dk ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"}`, borderRadius: 14, boxShadow: dk ? "0 16px 48px rgba(0,0,0,.7)" : "0 12px 36px rgba(0,0,0,.14)", minWidth: 170, overflow: "hidden", animation: "scaleIn 0.2s cubic-bezier(0.22,1,0.36,1) both", transformOrigin: "top right" }}>
                    {menuItems.map((item, i) => (
                      <button key={i} onClick={item.action} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", color: item.color, fontSize: 13, fontWeight: 500, textAlign: "left", transition: "background 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = dk ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <item.icon size={14} />
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Post body — edit mode or display */}
            {editing ? (
              <div style={{ marginBottom: 8 }}>
                <textarea
                  autoFocus value={editText} onChange={e => setEditText(e.target.value)}
                  style={{ width: "100%", minHeight: 72, background: th.inp, border: `1.5px solid #6366f1`, borderRadius: 10, padding: "8px 12px", fontSize: 14, lineHeight: 1.6, color: th.txt, outline: "none", resize: "vertical", fontFamily: "inherit" }}
                />
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button onClick={saveEdit} style={{ display: "flex", alignItems: "center", gap: 5, background: "#6366f1", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", color: "#fff", fontSize: 12, fontWeight: 700 }}>
                    <Check size={13} /> Save
                  </button>
                  <button onClick={() => { setEditing(false); setEditText(post.text || ""); }} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: th.txt2, fontSize: 12 }}>
                    <X size={13} /> Cancel
                  </button>
                  <span style={{ fontSize: 11, color: th.txt3, alignSelf: "center", marginLeft: "auto" }}>5-min window</span>
                </div>
              </div>
            ) : post.text && (
              <p style={{ margin: "0 0 8px", fontSize: 14, lineHeight: 1.75, color: th.txt, whiteSpace: "pre-wrap" }}>
                {post.text.split(/(\*\*[^*]+\*\*|#[a-zA-Z0-9_]+)/g).map((p, i) => {
                  if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
                  if (p.startsWith("#")) return <span key={i} style={{ color: "#3b82f6", fontWeight: 600, cursor: "pointer" }} onClick={() => onTag?.(p.toLowerCase())}>{p}</span>;
                  return <span key={i}>{p}</span>;
                })}
              </p>
            )}

            {post.hashtags?.length > 0 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                {post.hashtags.map((h, i) => (
                  <span key={i} onClick={() => onTag?.(h)} style={{ fontSize: 12, background: "#3b82f618", color: "#3b82f6", padding: "2px 8px", borderRadius: 99, cursor: "pointer", fontWeight: 600 }}>{h}</span>
                ))}
              </div>
            )}
            {mediaItems.length > 0 && (
              <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#000", marginBottom: 10 }}>
                {mediaItems[mediaIdx]?.type === "audio"
                  ? <div style={{ height: 60, background: "linear-gradient(135deg,#8b5cf6,#3b82f6)", display: "flex", alignItems: "center", gap: 12, padding: "0 16px" }}>
                      <Mic size={20} color="#fff" />
                      <audio src={mediaItems[mediaIdx].url} controls style={{ flex: 1, height: 36 }} />
                    </div>
                  : mediaItems[mediaIdx]?.type?.startsWith("video")
                    ? <video src={mediaItems[mediaIdx].url} controls style={{ width: "100%", maxHeight: 320, objectFit: "contain" }} />
                    : <img src={mediaItems[mediaIdx]?.url} alt="post" style={{ width: "100%", maxHeight: 360, objectFit: "cover", display: "block" }} />
                }
                {mediaItems.length > 1 && (
                  <>
                    <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4 }}>
                      {mediaItems.map((_, i) => <div key={i} onClick={() => setMediaIdx(i)} style={{ width: i === mediaIdx ? 16 : 6, height: 6, borderRadius: 99, background: i === mediaIdx ? "#fff" : "rgba(255,255,255,.5)", cursor: "pointer", transition: "all .2s" }} />)}
                    </div>
                    {mediaIdx > 0 && <button onClick={() => setMediaIdx(i => i - 1)} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,.5)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}><ChevronLeft size={14} /></button>}
                    {mediaIdx < mediaItems.length - 1 && <button onClick={() => setMediaIdx(i => i + 1)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,.5)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}><ChevronRight size={14} /></button>}
                  </>
                )}
              </div>
            )}
            {post.is_sponsored && (
              <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700, background: "#f59e0b15", padding: "2px 8px", borderRadius: 6, display: "inline-block", marginBottom: 6 }}>SPONSORED</div>
            )}
            {post.comments?.length > 0 && (
              <div style={{ background: th.surf2, borderRadius: 10, padding: 10, marginBottom: 8, border: `1px solid ${th.bdr}` }}>
                {post.comments.slice(0, 3).map(c => {
                  const cp = profiles[c.uid] || { name: "User" };
                  return (
                    <div key={c.id} style={{ display: "flex", gap: 7, marginBottom: 6 }}>
                      <div onClick={() => onProfile(c.uid)} style={{ cursor: "pointer" }}><Av profile={cp} size={22} /></div>
                      <div style={{ flex: 1, background: th.surf, borderRadius: 8, padding: "5px 10px", border: `1px solid ${th.bdr}` }}>
                        <span onClick={() => onProfile(c.uid)} style={{ fontWeight: 600, fontSize: 12, color: th.txt, cursor: "pointer" }}>{cp.name} </span>
                        <span style={{ fontSize: 12, color: th.txt2 }}>{c.text}</span>
                      </div>
                    </div>
                  );
                })}
                {post.comments.length > 3 && <p style={{ fontSize: 11, color: th.txt3, margin: "4px 0 0" }}>+{post.comments.length - 3} more</p>}
              </div>
            )}
            <div style={{ display: "flex", gap: 2, flexWrap: "wrap", marginTop: 4 }}>
              <button onClick={() => onLike(post.id)} className="rs-icon-btn" style={{ display: "flex", alignItems: "center", gap: 4, background: post.liked ? "#ef444418" : "transparent", border: "none", cursor: "pointer", padding: "5px 8px", borderRadius: 8, color: post.liked ? "#ef4444" : th.txt3, fontSize: 13, fontWeight: post.liked ? 700 : 400 }}>
                <Heart size={14} fill={post.liked ? "#ef4444" : "none"} style={{ transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)", transform: post.liked ? "scale(1.2)" : "scale(1)" }} /> {fmt(post.likes)}
              </button>
              <button onClick={() => setShowCmt(x => !x)} className="rs-icon-btn" style={{ display: "flex", alignItems: "center", gap: 4, background: showCmt ? "#3b82f618" : "transparent", border: "none", cursor: "pointer", padding: "5px 8px", borderRadius: 8, color: showCmt ? "#3b82f6" : th.txt3, fontSize: 13 }}>
                <MessageCircle size={14} /> {post.comments?.length || ""}
              </button>
              <button onClick={() => setShowRepostMenu(true)} className="rs-icon-btn" style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "none", cursor: "pointer", padding: "5px 8px", borderRadius: 8, color: th.txt3, fontSize: 13 }}>
                <Repeat2 size={14} /> {fmt(post.reposts)}
              </button>
              <button onClick={() => setShowShare(true)} className="rs-icon-btn" style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "none", cursor: "pointer", padding: "5px 8px", borderRadius: 8, color: th.txt3, fontSize: 13 }}>
                <Share2 size={14} />
              </button>
              <button onClick={() => onBookmark?.(post.id)} className="rs-icon-btn" style={{ display: "flex", alignItems: "center", background: isBookmarked ? "#3b82f618" : "transparent", border: "none", cursor: "pointer", padding: "5px 8px", borderRadius: 8, color: isBookmarked ? "#3b82f6" : th.txt3, marginLeft: "auto" }}>
                <Bookmark size={14} fill={isBookmarked ? "#3b82f6" : "none"} />
              </button>
            </div>
            {showCmt && (
              <div style={{ display: "flex", gap: 7, marginTop: 8, animation: "fadeUp 0.25s ease both" }}>
                <Av profile={profiles[me] || {}} size={28} />
                <div style={{ flex: 1, display: "flex", gap: 6 }}>
                  <input value={cmt} onChange={e => setCmt(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="Write a reply…" style={{ flex: 1, background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "7px 12px", fontSize: 13, outline: "none", color: th.txt }} />
                  <button onClick={submit} style={{ background: "#3b82f6", border: "none", borderRadius: 10, padding: "0 12px", cursor: "pointer", color: "#fff" }}><Send size={14} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}

export default PostCard;
