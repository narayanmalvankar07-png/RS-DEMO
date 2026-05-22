import { useState, useEffect, useRef } from "react";
import { ArrowLeft, MessageCircle, Heart, Edit3, Check, X, Rocket, TrendingUp, Briefcase, Zap, Code2, Palette, Globe, Brain, GraduationCap, Microscope, Sparkles, Building2, User, Camera, Github, Linkedin, Twitter, FileText } from "lucide-react";
import { T, ROLES, WHO_OPTS, INT_OPTS } from "../config/constants.js";

const ROLE_ICON_MAP = {
  founder: Rocket, investor: TrendingUp, professional: Briefcase,
  entrepreneur: Zap, developer: Code2, designer: Palette,
  diplomat: Globe, selfemployed: Brain, student: GraduationCap,
  researcher: Microscope, creator: Sparkles, executive: Building2,
};
import { db } from "../services/supabase.js";
import Av from "../components/ui/Av.jsx";
import SGN from "../components/ui/SGN.jsx";
import Card from "../components/ui/Card.jsx";
import Spin from "../components/ui/Spin.jsx";
import PostCard from "../components/shared/PostCard.jsx";

export default function ProfileView({ uid, me, dk, onBack, bals, profiles, setBals, onMessage, addNotif, onProfileUpdate }) {
  const th = T(dk);
  const profile = profiles[uid] || { name: "Unknown", handle: "unknown", bio: "No profile available." };
  const balance = bals[uid] ?? 0;
  const role = ROLES[profile.system_role] || "Member";
  const isOwnProfile = uid === me;
  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBio, setEditBio] = useState(profile.bio || "");
  const [editName, setEditName] = useState(profile.name || "");
  const [saving, setSaving] = useState(false);

  const getSocialLinksObj = (raw) => {
    if (!raw) return { website: "", github: "", resume: "", linkedin: "", twitter: "" };
    if (typeof raw === "object") return {
      website: raw.website || "",
      github: raw.github || "",
      resume: raw.resume || "",
      linkedin: raw.linkedin || "",
      twitter: raw.twitter || "",
    };
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          website: parsed.website || "",
          github: parsed.github || "",
          resume: parsed.resume || "",
          linkedin: parsed.linkedin || "",
          twitter: parsed.twitter || "",
        };
      }
    } catch { }
    return { website: "", github: "", resume: "", linkedin: "", twitter: "" };
  };

  const fileInputRef = useRef(null);
  const [editAvatar, setEditAvatar] = useState(profile.avatar || "");
  const [editSocials, setEditSocials] = useState(getSocialLinksObj(profile.social_links));
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);

    try {
      const res = await fetch("/api/upload-attachment", {
        method: "POST",
        headers: {
          "x-user-id": me,
          "x-file-name": file.name,
          "Content-Type": file.type || "application/octet-stream"
        },
        body: file
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          setEditAvatar(data.url);
          setUploadingAvatar(false);
          return;
        }
      }

      console.warn("Server avatar upload failed, falling back to base64 reader");
      const reader = new FileReader();
      reader.onload = (ev) => {
        setEditAvatar(ev.target.result);
        setUploadingAvatar(false);
      };
      reader.readAsDataURL(file);

    } catch (err) {
      console.error("Avatar upload failed, falling back to base64 reader:", err);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setEditAvatar(ev.target.result);
        setUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancel = () => {
    setEditName(profile.name || "");
    setEditBio(profile.bio || "");
    setEditAvatar(profile.avatar || "");
    setEditSocials(getSocialLinksObj(profile.social_links));
    setEditing(false);
  };
  const [tab, setTab] = useState("posts");
  const [reposts, setReposts] = useState([]);
  const [isAligned, setIsAligned] = useState(false);
  const [checkingAlign, setCheckingAlign] = useState(false);

  const updatePostState = (id, updates) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    setReposts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    setLikedPosts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleLike = async (id, fallbackLiked) => {
    const p = posts.find(x => x.id === id) || reposts.find(x => x.id === id) || likedPosts.find(x => x.id === id);
    if (!p) return;
    const currentLiked = p.liked !== undefined ? p.liked : fallbackLiked;
    const nl = !currentLiked;
    const lc = nl ? (p.like_count || 0) + 1 : Math.max(0, (p.like_count || 0) - 1);

    updatePostState(id, { like_count: lc, liked: nl });
    if (nl) {
      await db.post("rs_post_likes", { post_id: id, uid: me });
      if (p.uid !== me) {
        try { await db.post("rs_notifications", { uid: p.uid, type: "like", msg: `${profiles[me]?.name || "Someone"} liked your post`, post_id: id, profile_id: me, read: false }); } catch (e) { }
      }
    } else {
      await db.del("rs_post_likes", `post_id=eq.${id}&uid=eq.${me}`);
    }
    await db.patch("rs_posts", `id=eq.${id}`, { like_count: lc });
  };

  const handleRepost = async (orig) => {
    const nc = (orig.repost_count || 0) + 1;
    updatePostState(orig.id, { repost_count: nc, reposted: true });
    await db.patch("rs_posts", `id=eq.${orig.id}`, { repost_count: nc });
    await db.post("rs_posts", { uid: orig.uid, text: orig.text, media: orig.media, hashtags: orig.hashtags, location: orig.location, like_count: 0, repost_count: 0, reposted_by: me, original_post_id: orig.id });
    addNotif?.({ type: "action", msg: "You reposted a signal" });
  };

  const handleQuoteRepost = async (orig, quoteText) => {
    const nc = (orig.repost_count || 0) + 1;
    updatePostState(orig.id, { repost_count: nc, reposted: true });
    await db.patch("rs_posts", `id=eq.${orig.id}`, { repost_count: nc });
    await db.post("rs_posts", { uid: me, text: orig.text, media: orig.media, hashtags: orig.hashtags, location: orig.location, like_count: 0, repost_count: 0, reposted_by: me, quote_text: quoteText, original_post_id: orig.id });
    addNotif?.({ type: "action", msg: "You quote-reposted a signal" });
  };

  const handleUndoRepost = async (id) => {
    let origId = id;
    let p = posts.find(x => x.id === id) || reposts.find(x => x.id === id) || likedPosts.find(x => x.id === id);
    if (p && p.reposted_by === me && p.original_post_id) {
      origId = p.original_post_id;
      p = posts.find(x => x.id === origId) || reposts.find(x => x.id === origId) || likedPosts.find(x => x.id === origId) || p;
    }
    if (!p) return;
    const nc = Math.max(0, (p.repost_count || 0) - 1);
    
    // Filter out the repost item visually
    setPosts(prev => prev.filter(x => !(x.original_post_id === origId && x.reposted_by === me && !x.quote_text)).map(x => x.id === origId ? { ...x, repost_count: nc, reposted: false } : x));
    setReposts(prev => prev.filter(x => !(x.original_post_id === origId && x.reposted_by === me && !x.quote_text)).map(x => x.id === origId ? { ...x, repost_count: nc, reposted: false } : x));
    setLikedPosts(prev => prev.filter(x => !(x.original_post_id === origId && x.reposted_by === me && !x.quote_text)).map(x => x.id === origId ? { ...x, repost_count: nc, reposted: false } : x));
    
    await db.patch("rs_posts", `id=eq.${origId}`, { repost_count: nc });
    await db.del("rs_posts", `original_post_id=eq.${origId}&reposted_by=eq.${me}`);
  };

  const handleComment = async (id, text) => {
    const saved = await db.post("rs_comments", { post_id: id, uid: me, text });
    if (saved) {
      const p = posts.find(x => x.id === id) || reposts.find(x => x.id === id) || likedPosts.find(x => x.id === id);
      const existing = p?.comments || [];
      updatePostState(id, { comments: [...existing, { ...saved, uid: me }] });
      addNotif?.({ type: "success", msg: "Comment added" });
    }
  };

  useEffect(() => {
    setEditBio(profile.bio || "");
    setEditName(profile.name || "");
    setEditAvatar(profile.avatar || "");
    setEditSocials(getSocialLinksObj(profile.social_links));
  }, [uid, profile.bio, profile.name, profile.avatar, profile.social_links]);

  useEffect(() => {
    setLoadingPosts(true);
    Promise.all([
      db.get("rs_posts", `order=created_at.desc&limit=150`),
      db.get("rs_comments", "order=created_at.asc"),
      db.get("rs_post_likes", `uid=eq.${me}`),
      db.get("rs_posts", `reposted_by=eq.${me}`)
    ]).then(([d, allComments, myLikes, myOwnReposts]) => {
      const ls = new Set((myLikes || []).map(l => l.post_id));
      const cs = allComments || [];
      const repSet = new Set((myOwnReposts || []).filter(r => r.original_post_id).map(r => r.original_post_id));
      const myFeed = (d || []).map(p => ({
        ...p,
        liked: ls.has(p.id),
        reposted: repSet.has(p.id),
        comments: cs.filter(c => c.post_id === p.id)
      }));
      const myOriginals = myFeed.filter(p => p.uid === uid && p.reposted_by !== uid);
      const myReposts = myFeed.filter(p => p.reposted_by === uid);
      setPosts(myOriginals.slice(0, 30));
      setReposts(myReposts.slice(0, 30));
      setLoadingPosts(false);
    });
  }, [uid, me]);

  useEffect(() => {
    if (tab === "likes" && likedPosts.length === 0) {
      setLoadingLikes(true);
      // Fetch from local cache without a query so it doesn't try to override with an empty remote result if offline/syncing
      db.get("rs_post_likes", "").then(allLikes => {
        const likes = (allLikes || []).filter(l => l.uid === uid);
        if (!likes.length) {
          setLoadingLikes(false);
          return;
        }
        Promise.all([
          db.get("rs_posts", `order=created_at.desc&limit=200`),
          db.get("rs_comments", "order=created_at.asc"),
          db.get("rs_post_likes", `uid=eq.${me}`),
          db.get("rs_posts", `reposted_by=eq.${me}`)
        ]).then(([allPosts, allComments, myLikes, myOwnReposts]) => {
          const ls = new Set((myLikes || []).map(l => l.post_id));
          const cs = allComments || [];
          const repSet = new Set((myOwnReposts || []).filter(r => r.original_post_id).map(r => r.original_post_id));
          const likedIds = new Set(likes.map(l => l.post_id));
          const p = (allPosts || []).filter(x => likedIds.has(x.id)).map(p => ({
            ...p,
            liked: ls.has(p.id),
            reposted: repSet.has(p.id),
            comments: cs.filter(c => c.post_id === p.id)
          }));
          setLikedPosts(p);
          setLoadingLikes(false);
        });
      });
    }
  }, [tab, uid, likedPosts.length, me]);

  useEffect(() => {
    if (isOwnProfile) return;
    setCheckingAlign(true);
    db.get("rs_alignments", `follower_uid=eq.${me}&following_uid=eq.${uid}`).then(d => {
      setIsAligned(d && d.length > 0);
      setCheckingAlign(false);
    });
  }, [uid, me, isOwnProfile]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const payload = {
        name: editName,
        bio: editBio,
        avatar: editAvatar,
        social_links: editSocials
      };
      await db.patch("rs_user_profiles", `id=eq.${uid}`, payload);
      onProfileUpdate?.(uid, payload);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };
  const toggleAlign = async () => {
    if (checkingAlign) return;
    setCheckingAlign(true);
    const targetName = profile.name || "a member";
    const myName = profiles[me]?.name || "a member";

    if (isAligned) {
      // Unfollow / Misalign
      setIsAligned(false);
      try {
        await db.del("rs_alignments", `follower_uid=eq.${me}&following_uid=eq.${uid}`);
        addNotif?.({ type: "info", msg: `⛓️ You misaligned with ${targetName}` });
      } catch (err) {
        console.error("Failed to misalign:", err);
        setIsAligned(true);
      } finally {
        setCheckingAlign(false);
      }
    } else {
      // Follow / Align
      setIsAligned(true);
      try {
        await db.upsert("rs_alignments", { follower_uid: me, following_uid: uid });
        try {
          await db.post("rs_notifications", {
            uid: uid,
            type: "align_accept",
            msg: `✅ ${myName} aligned with you`,
            read: false
          });
        } catch (notifErr) {
          console.error("Notification post failed:", notifErr);
        }
        addNotif?.({ type: "success", msg: `🔗 You are now aligned with ${targetName}!` });
      } catch (err) {
        console.error("Failed to align:", err);
        setIsAligned(false);
      } finally {
        setCheckingAlign(false);
      }
    }
  };

  const whoOpt = WHO_OPTS.find(w => w.id === profile.who);
  const interests = (profile.interests || []).map(id => INT_OPTS.find(x => x.id === id)).filter(Boolean);
  const postCount = posts.length;
  const totalLikes = posts.reduce((s, p) => s + (p.like_count || 0), 0);

  return (
    <div>
      <button onClick={onBack} style={{ marginBottom: 16, background: "transparent", border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "8px 12px", cursor: "pointer", color: th.txt2, display: "inline-flex", alignItems: "center", gap: 6 }}>
        <ArrowLeft size={16} />Back
      </button>

      <Card dk={dk} style={{ padding: 24, marginBottom: 14 }}>
        {whoOpt && (
          <div style={{ height: 6, borderRadius: 99, background: `linear-gradient(90deg,${whoOpt.c},${whoOpt.c}44)`, marginBottom: 20, marginTop: -4 }} />
        )}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          {editing ? (
            <div style={{ position: "relative", cursor: "pointer" }} onClick={() => fileInputRef.current?.click()}>
              <Av profile={{ ...profile, avatar: editAvatar }} size={80} bal={balance} />
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(2px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                gap: 4,
                opacity: 0.9,
                transition: "opacity 0.2s",
              }}>
                {uploadingAvatar ? (
                  <Spin dk={true} size="sm" msg="" />
                ) : (
                  <>
                    <Camera size={18} />
                    <span style={{ fontSize: 9, fontWeight: 700 }}>EDIT</span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleAvatarUpload}
              />
            </div>
          ) : (
            <Av profile={profile} size={80} bal={balance} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <input value={editName} onChange={e => setEditName(e.target.value)} style={{ fontSize: 22, fontWeight: 800, color: th.txt, background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 8, padding: "4px 10px", outline: "none", width: "100%", boxSizing: "border-box", marginBottom: 6 }} />
            ) : (
              <div style={{ fontSize: 22, fontWeight: 800, color: th.txt }}>{profile.name}</div>
            )}
            <div style={{ fontSize: 13, color: th.txt3, marginBottom: 4 }}>@{profile.handle || profile.email || uid.slice(0, 8)}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {whoOpt && (() => { const RI = ROLE_ICON_MAP[whoOpt.id] || User; return <span style={{ fontSize: 11, background: `${whoOpt.c}18`, color: whoOpt.c, padding: "3px 10px", borderRadius: 99, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}><RI size={10} />{whoOpt.label}</span>; })()}
              {profile.system_role && profile.system_role !== "user" && <span style={{ fontSize: 11, background: dk ? "rgba(59,130,246,.12)" : "#eff6ff", color: "#3b82f6", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>{role}</span>}
              {profile.verified && <span style={{ color: "#3b82f6", fontSize: 13, fontWeight: 700 }}>✓ Verified</span>}
            </div>
          </div>
          <SGN n={balance} size="lg" />
        </div>

        <div style={{ marginTop: 14 }}>
          {editing ? (
            <>
              <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={3} style={{ width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "10px 12px", color: th.txt, outline: "none", fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />

              <div style={{ marginTop: 16, borderTop: `1px solid ${th.bdr}`, paddingTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: th.txt, marginBottom: 12 }}>Social & Web Links</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                  {[
                    { label: "Website", key: "website", icon: Globe },
                    { label: "GitHub", key: "github", icon: Github },
                    { label: "Resume", key: "resume", icon: FileText },
                    { label: "LinkedIn", key: "linkedin", icon: Linkedin },
                    { label: "Twitter / X", key: "twitter", icon: Twitter },
                  ].map(({ label, key, icon: Icon }) => (
                    <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: th.txt3, display: "flex", alignItems: "center", gap: 4 }}>
                        <Icon size={12} /> {label}
                      </label>
                      <input
                        value={editSocials[key] || ""}
                        onChange={e => setEditSocials(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={`https://...`}
                        style={{
                          width: "100%",
                          background: th.inp,
                          border: `1px solid ${th.inpB}`,
                          borderRadius: 8,
                          padding: "8px 10px",
                          fontSize: 12,
                          outline: "none",
                          boxSizing: "border-box",
                          color: th.txt
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <p style={{ margin: 0, color: th.txt2, fontSize: 14, lineHeight: 1.7 }}>{profile.bio || "No bio yet."}</p>

              {(() => {
                const socials = getSocialLinksObj(profile.social_links);
                const hasSocials = Object.values(socials).some(v => v && v.trim());
                if (!hasSocials) return null;
                return (
                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    {[
                      { label: "Website", key: "website", icon: Globe, color: "#10b981" },
                      { label: "GitHub", key: "github", icon: Github, color: dk ? "#fff" : "#000" },
                      { label: "Resume", key: "resume", icon: FileText, color: "#ef4444" },
                      { label: "LinkedIn", key: "linkedin", icon: Linkedin, color: "#0077b5" },
                      { label: "Twitter", key: "twitter", icon: Twitter, color: "#1da1f2" },
                    ].map(({ label, key, icon: Icon, color }) => {
                      const url = socials[key];
                      if (!url || !url.trim()) return null;
                      const href = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
                      return (
                        <a
                          key={key}
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            color: th.txt,
                            background: dk ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
                            border: `1px solid ${th.bdr}`,
                            borderRadius: 99,
                            padding: "4px 12px",
                            cursor: "pointer",
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = "translateY(-1px)";
                            e.currentTarget.style.background = dk ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)";
                            e.currentTarget.style.borderColor = color;
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.background = dk ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)";
                            e.currentTarget.style.borderColor = th.bdr;
                          }}
                        >
                          <Icon size={13} style={{ color }} />
                          <span>{label}</span>
                        </a>
                      );
                    })}
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {interests.length > 0 && (
          <div style={{ display: "flex", gap: 5, marginTop: 12, flexWrap: "wrap" }}>
            {interests.map((opt, i) => (
              <span key={opt.id} style={{ fontSize: 11, background: `${opt.c}18`, color: opt.c, padding: "3px 10px", borderRadius: 99, fontWeight: 600 }}>{opt.label}</span>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 16 }}>
          {[["Posts", postCount], ["Likes", totalLikes], ["SGN", balance]].map(([label, val]) => (
            <div key={label} style={{ textAlign: "center", background: th.surf2, borderRadius: 10, padding: "10px 8px", border: `1px solid ${th.bdr}` }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: th.txt }}>{val}</div>
              <div style={{ fontSize: 11, color: th.txt3, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
          {!isOwnProfile && (
            <>
              <button
                onClick={() => {
                  if (!isAligned) {
                    addNotif?.({ type: "warning", msg: "🔗 Align First - Send an align request to message this user" });
                    return;
                  }
                  onMessage(uid);
                }}
                disabled={checkingAlign}
                title={!isAligned ? "Align First" : ""}
                style={{ display: "flex", alignItems: "center", gap: 6, background: isAligned ? "#3b82f6" : "#9333ea", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", cursor: isAligned ? "pointer" : "not-allowed", fontWeight: 600, fontSize: 13, opacity: isAligned ? 1 : 0.6 }}>
                <MessageCircle size={15} />Message
              </button>
              {isAligned ? (
                <button
                  onClick={toggleAlign}
                  disabled={checkingAlign}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: dk ? "rgba(239, 68, 68, 0.08)" : "rgba(239, 68, 68, 0.05)",
                    color: "#ef4444",
                    border: `1px solid ${dk ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.15)"}`,
                    borderRadius: 10,
                    padding: "10px 16px",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = dk ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.1)";
                    e.currentTarget.style.borderColor = "#ef4444";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = dk ? "rgba(239, 68, 68, 0.08)" : "rgba(239, 68, 68, 0.05)";
                    e.currentTarget.style.borderColor = dk ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.15)";
                  }}
                >
                  <X size={15} />Misalign
                </button>
              ) : (
                <button
                  onClick={toggleAlign}
                  disabled={checkingAlign}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 16px",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 6px 16px rgba(99, 102, 241, 0.3)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(99, 102, 241, 0.2)";
                  }}
                >
                  <Zap size={15} />Align
                </button>
              )}
            </>
          )}
          {isOwnProfile && !editing && (
            <button onClick={() => setEditing(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: th.surf2, color: th.txt, border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
              <Edit3 size={15} />Edit Profile
            </button>
          )}
          {isOwnProfile && editing && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveProfile} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, background: "#10b981", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                <Check size={15} />{saving ? "Saving…" : "Save"}
              </button>
              <button onClick={handleCancel} style={{ display: "flex", alignItems: "center", gap: 6, background: th.surf2, color: th.txt, border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontSize: 13 }}>
                <X size={15} />Cancel
              </button>
            </div>
          )}

          {/* About items moved to the right */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginLeft: "auto" }}>
            {[
              { label: "Email", value: profile.email },
              { label: "Role", value: whoOpt ? whoOpt.label : null },
              { label: "System", value: role },
              { label: "Ref Code", value: profile.ref_code },
            ].filter(x => x.value).map(({ label, value }) => (
              <span key={label} style={{ fontSize: 11, background: th.surf, border: `1px solid ${th.bdr}`, padding: "5px 10px", borderRadius: 8, color: th.txt2, display: "inline-flex", gap: 6 }}>
                <span style={{ fontWeight: 700, color: th.txt }}>{label}:</span> {value}
              </span>
            ))}
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 4, marginBottom: 14, background: th.surf2, borderRadius: 10, padding: 4, border: `1px solid ${th.bdr}` }}>
        {["posts", "reposts", "likes"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "7px", borderRadius: 7, border: "none", background: tab === t ? "#3b82f6" : "transparent", color: tab === t ? "#fff" : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{t}</button>
        ))}
      </div>

      {tab === "posts" && (
        loadingPosts ? <Spin dk={dk} msg="Loading posts…" /> :
          posts.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: th.txt3 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <p>No posts yet.</p>
            </div>
          ) : (
            <div>
              {posts.map(p => (
                <PostCard key={p.id} post={{ ...p, id: p.id, uid: p.uid, text: p.text, media: p.media || [], hashtags: p.hashtags || [], likes: p.like_count || 0, reposts: p.repost_count || 0, liked: p.liked !== undefined ? p.liked : false, reposted: p.reposted !== undefined ? p.reposted : false, comments: p.comments || [], ts: new Date(p.created_at).getTime() }} me={me} onLike={() => handleLike(p.id, false)} onRepost={() => handleRepost(p)} onUndoRepost={() => handleUndoRepost(p.id)} onQuoteRepost={(orig, qt) => handleQuoteRepost(orig, qt)} onComment={handleComment} onBookmark={() => { }} dk={dk} onProfile={() => { }} bals={bals} profiles={profiles} onTag={() => { }} bookmarks={[]} />
              ))}
            </div>
          )
      )}

      {tab === "likes" && (
        loadingLikes ? <Spin dk={dk} msg="Loading likes…" /> :
          likedPosts.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: th.txt3 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🤍</div>
              <p>No liked posts yet.</p>
            </div>
          ) : (
            <div>
              {likedPosts.map(p => (
                <PostCard key={p.id} post={{ ...p, id: p.id, uid: p.uid, text: p.text, media: p.media || [], hashtags: p.hashtags || [], likes: p.like_count || 0, reposts: p.repost_count || 0, liked: p.liked !== undefined ? p.liked : true, reposted: p.reposted !== undefined ? p.reposted : false, comments: p.comments || [], ts: new Date(p.created_at).getTime() }} me={me} onLike={() => handleLike(p.id, true)} onRepost={() => handleRepost(p)} onUndoRepost={() => handleUndoRepost(p.id)} onQuoteRepost={(orig, qt) => handleQuoteRepost(orig, qt)} onComment={handleComment} onBookmark={() => { }} dk={dk} onProfile={() => { }} bals={bals} profiles={profiles} onTag={() => { }} bookmarks={[]} />
              ))}
            </div>
          )
      )}

      {tab === "reposts" && (
        loadingPosts ? <Spin dk={dk} msg="Loading reposts…" /> :
          reposts.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: th.txt3 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔁</div>
              <p>No reposts yet.</p>
            </div>
          ) : (
            <div>
              {reposts.map(p => (
                <PostCard key={p.id} post={{ ...p, id: p.id, uid: p.uid, text: p.text, media: p.media || [], hashtags: p.hashtags || [], likes: p.like_count || 0, reposts: p.repost_count || 0, liked: p.liked !== undefined ? p.liked : false, reposted: p.reposted !== undefined ? p.reposted : false, comments: p.comments || [], ts: new Date(p.created_at).getTime() }} me={me} onLike={() => handleLike(p.id, false)} onRepost={() => handleRepost(p)} onUndoRepost={() => handleUndoRepost(p.id)} onQuoteRepost={(orig, qt) => handleQuoteRepost(orig, qt)} onComment={handleComment} onBookmark={() => { }} dk={dk} onProfile={() => { }} bals={bals} profiles={profiles} onTag={() => { }} bookmarks={[]} />
              ))}
            </div>
          )
      )}
    </div>
  );
}