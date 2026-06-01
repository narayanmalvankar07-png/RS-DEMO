// src/views/FeedView.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { Hash, X, Bookmark, Sparkles } from "lucide-react";
import { T, SEED_POSTS, WHO_OPTS, INT_OPTS } from '../config/constants.js';
import { genId } from '../utils/helpers.js';
import { db } from '../services/supabase.js';
import Spin from '../components/ui/Spin.jsx';
import Composer from '../components/shared/Composer.jsx';
import PostCard from '../components/shared/PostCard.jsx';

function FeedView({ me, dk, myProfile, onProfile, bals, profiles, addNotif, bookmarks, onBookmark, focusPostId, focusCommentId, onFocusHandled, activeTag: propActiveTag, setActiveTag: propSetActiveTag }) {
  const th = T(dk);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("For You");
  const [localActiveTag, setLocalActiveTag] = useState(null);
  const activeTag = propActiveTag !== undefined ? propActiveTag : localActiveTag;
  const setActiveTag = propSetActiveTag !== undefined ? propSetActiveTag : setLocalActiveTag;
  const postRefs = useRef({});
  const pendingLikes = useRef(new Set());

  const load = useCallback(async () => {
    const [rp, allLikes, ac] = await Promise.all([
      db.get("rs_posts", "order=created_at.desc&limit=80"),
      db.get("rs_post_likes"),
      db.get("rs_comments", "order=created_at.desc&limit=500")
    ]);
    const ml = (allLikes || []).filter(l => l.uid === me);
    const myReposts = (rp || []).filter(p => p.reposted_by === me);
    const ls = new Set(ml.map(l => l.post_id));
    const repSet = new Set(myReposts.filter(r => r.original_post_id).map(r => r.original_post_id));
    let rows = rp || [];
    if (!rows.length) { await db.postMany("rs_posts", SEED_POSTS); rows = await db.get("rs_posts", "order=created_at.desc&limit=80") || []; }
    setPosts(rows.map(p => ({
      id: p.id, uid: p.uid, text: p.text, media: p.media || [],
      hashtags: p.hashtags || [], location: p.location,
      likes: p.like_count || 0, reposts: p.repost_count || 0,
      liked: ls.has(p.id), reposted: repSet.has(p.id) || p.reposted_by === me, comments: (ac || []).filter(c => c.post_id === p.id).reverse(),
      ts: new Date(p.created_at).getTime(), reposted_by: p.reposted_by,
      quote_text: p.quote_text, is_sponsored: p.is_sponsored, original_post_id: p.original_post_id,
    })));
    setLoading(false);
  }, [me]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!focusPostId) return;
    setTab("For You");
    setActiveTag(null);
  }, [focusPostId]);

  const addPost = async (text, media, location, hashtags) => {
    const tempId = genId();
    setPosts(ps => [{ id: tempId, uid: me, text, media, location, hashtags, likes: 0, reposts: 0, liked: false, comments: [], ts: Date.now() }, ...ps]);
    const saved = await db.post("rs_posts", { uid: me, text, media, location, hashtags, like_count: 0, repost_count: 0 });
    if (!saved) {
      setPosts(ps => ps.filter(p => p.id !== tempId));
      addNotif({ type: "error", msg: "Failed to post" });
      throw new Error("Failed");
    }
    setPosts(ps => ps.map(p => p.id === tempId ? { ...p, id: saved.id } : p));
  };

  const toggleLike = async id => {
    if (pendingLikes.current.has(id)) return;
    pendingLikes.current.add(id);

    try {
      const p = posts.find(x => x.id === id); if (!p) return;

      // 1. Instant UI update for snappy feedback
      const optimisticLiked = !p.liked;
      const optimisticCount = optimisticLiked ? (p.likes + 1) : Math.max(0, p.likes - 1);
      setPosts(ps => ps.map(x => x.id === id ? { ...x, liked: optimisticLiked, likes: optimisticCount } : x));

      // 2. Strict validate from backend (Cache-Busted via headers & fetch options)
      let alreadyLiked = false;
      try {
        const url = `${SB_URL}/rest/v1/rs_post_likes?post_id=eq.${id}&uid=eq.${me}`;
        const sess = JSON.parse(localStorage.getItem("rs_session") || "null");
        const hdrs = {
          "apikey": SB_KEY,
          "Authorization": sess?.access_token ? `Bearer ${sess.access_token}` : "",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        };
        const res = await fetch(url, { headers: hdrs, cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          alreadyLiked = data && data.length > 0;
        } else {
          // If network returns an error (like 400), fallback to local cache
          const existing = await db.get("rs_post_likes", `post_id=eq.${id}&uid=eq.${me}`);
          alreadyLiked = existing && existing.length > 0;
        }
      } catch (e) {
        // Fallback to local check if network fails
        const existing = await db.get("rs_post_likes", `post_id=eq.${id}&uid=eq.${me}`);
        alreadyLiked = existing && existing.length > 0;
      }

      // 3. True DB State Logic
      const postData = await db.get("rs_posts", `id=eq.${id}&select=like_count`);
      const currentDbCount = postData?.[0]?.like_count || 0;

      if (alreadyLiked) {
        // If exists -> remove, decrement, update UI
        await db.del("rs_post_likes", `post_id=eq.${id}&uid=eq.${me}`);
        const newCount = Math.max(0, currentDbCount - 1);
        await db.patch("rs_posts", `id=eq.${id}`, { like_count: newCount });
        setPosts(ps => ps.map(x => x.id === id ? { ...x, liked: false, likes: newCount } : x));
      } else {
        // If not exists -> create, increment, update UI
        const saved = await db.post("rs_post_likes", { post_id: id, uid: me });

        // ONLY increment if the insert was actually successful! (Prevents ++++ bug on 409 Conflict)
        if (saved) {
          const newCount = currentDbCount + 1;
          await db.patch("rs_posts", `id=eq.${id}`, { like_count: newCount });
          setPosts(ps => ps.map(x => x.id === id ? { ...x, liked: true, likes: newCount } : x));

          if (p.uid !== me) {
            try { await db.post("rs_notifications", { uid: p.uid, type: "like", msg: `${myProfile?.name || "Someone"} liked your post`, post_id: id, profile_id: me, read: false }); } catch (e) { }
          }
        } else {
          // If insert failed (e.g. 409 Conflict), revert optimistic UI
          setPosts(ps => ps.map(x => x.id === id ? { ...x, liked: false, likes: currentDbCount } : x));
        }
      }
    } finally {
      pendingLikes.current.delete(id);
    }
  };

  const doRepost = async orig => {
    const nc = (orig.reposts || 0) + 1;
    const newPost = { ...orig, id: genId(), reposts: nc, liked: false, reposted: false, comments: [], ts: Date.now(), reposted_by: me, original_post_id: orig.id };
    setPosts(ps => [newPost, ...ps.map(x => x.id === orig.id ? { ...x, reposts: nc, reposted: true } : x)]);
    await db.patch("rs_posts", `id=eq.${orig.id}`, { repost_count: nc });
    const saved = await db.post("rs_posts", { uid: me, text: orig.text, media: orig.media, hashtags: orig.hashtags, location: orig.location, like_count: 0, repost_count: 0, reposted_by: me, original_post_id: orig.id });
    if (!saved) {
      setPosts(ps => ps.filter(x => x.id !== newPost.id).map(x => x.id === orig.id ? { ...x, reposts: Math.max(0, nc - 1), reposted: false } : x));
      addNotif({ type: "error", msg: "Failed to repost" });
      return;
    }
    addNotif({ type: "action", msg: "You reposted a signal" });
    if (orig.uid !== me) {
      try { await db.post("rs_notifications", { uid: orig.uid, type: "repost", msg: `${myProfile?.name || "Someone"} reposted your post`, post_id: orig.id, profile_id: me, read: false }); } catch (e) { console.error("Notification error (repost):", e); }
    }
  };

  const doQuoteRepost = async (orig, quoteText) => {
    const nc = (orig.reposts || 0) + 1;
    const newPost = { ...orig, id: genId(), reposts: nc, liked: false, reposted: false, comments: [], ts: Date.now(), reposted_by: me, quote_text: quoteText, original_post_id: orig.id };
    setPosts(ps => [newPost, ...ps.map(x => x.id === orig.id ? { ...x, reposts: nc, reposted: true } : x)]);
    await db.patch("rs_posts", `id=eq.${orig.id}`, { repost_count: nc });
    const saved = await db.post("rs_posts", { uid: me, text: orig.text, media: orig.media, hashtags: orig.hashtags, location: orig.location, like_count: 0, repost_count: 0, reposted_by: me, quote_text: quoteText, original_post_id: orig.id });
    if (!saved) {
      setPosts(ps => ps.filter(x => x.id !== newPost.id).map(x => x.id === orig.id ? { ...x, reposts: Math.max(0, nc - 1), reposted: false } : x));
      addNotif({ type: "error", msg: "Failed to quote repost" });
      return;
    }
    addNotif({ type: "action", msg: "You quote-reposted a signal" });
    if (orig.uid !== me) {
      try { await db.post("rs_notifications", { uid: orig.uid, type: "quote", msg: `${myProfile?.name || "Someone"} quote-reposted your post`, post_id: orig.id, profile_id: me, read: false }); } catch (e) { console.error("Notification error (quote):", e); }
    }
  };

  const doUndoRepost = async id => {
    let origId = id;
    let p = posts.find(x => x.id === id);
    if (p && p.reposted_by === me && p.original_post_id) {
      origId = p.original_post_id;
      p = posts.find(x => x.id === origId) || p;
    }
    if (!p) return;
    const nc = Math.max(0, (p.reposts || 0) - 1);
    setPosts(ps => ps.filter(x => !(x.original_post_id === origId && x.reposted_by === me))
      .map(x => x.id === origId ? { ...x, reposts: nc, reposted: false } : x));
    await db.patch("rs_posts", `id=eq.${origId}`, { repost_count: nc });
    await db.del("rs_posts", `original_post_id=eq.${origId}&reposted_by=eq.${me}`);
  };

  const addComment = async (id, text) => {
    const post = posts.find(p => p.id === id);
    const saved = await db.post("rs_comments", { post_id: id, uid: me, text });
    if (saved) {
      setPosts(ps => ps.map(x => x.id === id ? { ...x, comments: [...x.comments, { ...saved, uid: me }] } : x));
      if (post && post.uid !== me) {
        try { await db.post("rs_notifications", { uid: post.uid, type: "comment", msg: `${myProfile?.name || "Someone"} commented on your post`, post_id: id, comment_id: saved.id, comment_text: text, profile_id: me, read: false }); } catch (e) { console.error("Notification error (comment):", e); }
      }
    }
  };

  const deletePost = async id => {
    setPosts(ps => ps.filter(x => x.id !== id));
    await db.del("rs_posts", `id=eq.${id}&uid=eq.${me}`);
  };

  const editPost = async (id, text) => {
    setPosts(ps => ps.map(x => x.id === id ? { ...x, text } : x));
    await db.patch("rs_posts", `id=eq.${id}`, { text });
  };

  const getFiltered = () => {
    let filtered = posts.filter(p => !(p.reposted_by === me && !p.quote_text));
    if (activeTag) return filtered.filter(p => p.hashtags?.includes(activeTag) || p.text?.toLowerCase().includes(activeTag));
    if (tab === "Trending") return [...filtered].sort((a, b) => (b.likes + b.reposts * 2) - (a.likes + a.reposts * 2));
    if (tab === "Following") return filtered.filter(p => p.uid === me);
    if (tab === "Bookmarks") return filtered.filter(p => bookmarks.includes(p.id));
    return filtered;
  };

  const whoOpt = WHO_OPTS.find(w => w.id === myProfile?.who);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", paddingRight: 4 }}>
        {focusPostId ? (
          <>
            <button onClick={() => onFocusHandled?.()} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", cursor: "pointer", color: th.txt2, fontSize: 13, fontWeight: 600, padding: "0 0 14px" }}>
              <span style={{ fontSize: 16 }}>←</span> Back to Feed
            </button>
            {getFiltered().filter(p => p.id === focusPostId).map((p, i) => (
              <div key={p.id + p.ts} ref={el => { if (el) postRefs.current[p.id] = el; }} style={{ animation: `fadeUp 0.3s cubic-bezier(0.22,1,0.36,1) both` }}>
                <PostCard post={p} me={me} onLike={toggleLike} onRepost={doRepost} onUndoRepost={doUndoRepost} onQuoteRepost={doQuoteRepost} onComment={addComment} onBookmark={onBookmark} onDelete={deletePost} onEdit={editPost} dk={dk} onProfile={onProfile} bals={bals} profiles={profiles} onTag={setActiveTag} bookmarks={bookmarks} forceShowComments={true} highlightCommentId={focusCommentId} />
              </div>
            ))}
          </>
        ) : (
          <>
            {whoOpt && (
              <div style={{ background: dk ? `linear-gradient(135deg,${whoOpt.c}18,transparent)` : `${whoOpt.c}10`, border: `1px solid ${whoOpt.c}30`, borderRadius: 16, padding: 12, marginBottom: 12, display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${whoOpt.c}18`, border: `1px solid ${whoOpt.c}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 16, color: whoOpt.c, fontWeight: 900 }}>{whoOpt.label[0]}</span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: th.txt }}>Welcome back, {myProfile?.name?.split(" ")[0]}!</div>
                  <div style={{ fontSize: 12, color: th.txt2 }}>Curated for {myProfile?.interests?.slice(0, 3).map(id => INT_OPTS.find(x => x.id === id)?.label).filter(Boolean).join(", ")}</div>
                </div>
              </div>
            )}
            <Composer me={me} onPost={addPost} dk={dk} myProfile={myProfile} />
            {activeTag && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, background: "#3b82f618", border: "1px solid #3b82f640", borderRadius: 10, padding: "8px 14px" }}>
                <Hash size={14} style={{ color: "#3b82f6" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#3b82f6" }}>{activeTag}</span>
                <button onClick={() => setActiveTag(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#3b82f6", display: "flex" }}><X size={14} /></button>
              </div>
            )}
            <div style={{ display: "flex", gap: 4, marginBottom: 14, background: th.surf2, borderRadius: 12, padding: 4, border: `1px solid ${th.bdr}` }}>
              {["For You", "Trending", "Following", "Bookmarks"].map(t => (
                <button key={t} onClick={() => { setTab(t); setActiveTag(null); }} style={{ flex: 1, padding: "7px", borderRadius: 9, border: "none", background: tab === t && !activeTag ? "#3b82f6" : "transparent", color: tab === t && !activeTag ? "#fff" : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .2s" }}>{t}</button>
              ))}
            </div>
            {loading ? <Spin dk={dk} msg="Loading feed..." /> : getFiltered().length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, color: th.txt3, animation: "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both" }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  {tab === "Bookmarks" ? <Bookmark size={24} color="#6366f1" /> : <Sparkles size={24} color="#6366f1" />}
                </div>
                <p style={{ fontSize: 15 }}>{tab === "Bookmarks" ? "No bookmarks yet. Save posts to see them here." : activeTag ? `No posts with ${activeTag}` : "No posts yet. Be the first!"}</p>
              </div>
            ) : getFiltered().map((p, i) => (
              <div key={p.id + p.ts} ref={el => { if (el) postRefs.current[p.id] = el; }} style={{ animation: `fadeUp 0.42s cubic-bezier(0.22,1,0.36,1) ${Math.min(i * 55, 550)}ms both` }}>
                <PostCard post={p} me={me} onLike={toggleLike} onRepost={doRepost} onUndoRepost={doUndoRepost} onQuoteRepost={doQuoteRepost} onComment={addComment} onBookmark={onBookmark} onDelete={deletePost} onEdit={editPost} dk={dk} onProfile={onProfile} bals={bals} profiles={profiles} onTag={setActiveTag} bookmarks={bookmarks} forceShowComments={false} highlightCommentId={null} />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default FeedView;