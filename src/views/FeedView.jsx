// src/views/FeedView.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { Hash, X, Bookmark, Sparkles } from "lucide-react";
import { T, WHO_OPTS, INT_OPTS, SB_URL, SB_KEY } from '../config/constants.js';
import { genId } from '../utils/helpers.js';
import { db } from '../services/supabase.js';
import { sendWSMessage, subscribeWS } from '../services/websocket.js';
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
  const likeManager = useRef({ states: {} });

  const load = useCallback(async () => {
    const [rp, allLikes, ac] = await Promise.all([
      db.get("rs_posts", "order=created_at.desc&limit=80"),
      db.get("rs_post_likes"),
      db.get("rs_comments", "order=created_at.desc&limit=500")
    ]);
    const ml = (allLikes || []).filter(l => l.uid === me);
    const ls = new Set(ml.map(l => l.post_id));
    let rows = rp || [];

    let extraComments = [];
    if (focusPostId && !rows.some(p => p.id === focusPostId)) {
      try {
        const [fetchedPost, fetchedComments] = await Promise.all([
          db.get("rs_posts", `id=eq.${focusPostId}`),
          db.get("rs_comments", `post_id=eq.${focusPostId}&order=created_at.desc`)
        ]);
        if (fetchedPost && fetchedPost.length > 0) {
          rows = [...fetchedPost, ...rows];
        }
        if (fetchedComments && fetchedComments.length > 0) {
          extraComments = fetchedComments;
        }
      } catch (e) {
        console.error("Error fetching focused post/comments:", e);
      }
    }

    const myReposts = rows.filter(p => p.reposted_by === me);
    const repSet = new Set(myReposts.filter(r => r.original_post_id).map(r => r.original_post_id));
    const allComments = (ac || []).concat(extraComments);

    setPosts(rows.map(p => {
      let original_uid = null;
      if (p.reposted_by && p.original_post_id) {
        const orig = rows.find(r => r.id === p.original_post_id);
        if (orig) original_uid = orig.uid;
      }
      return {
        id: p.id, uid: p.uid, text: p.text, media: p.media || [],
        hashtags: p.hashtags || [], location: p.location,
        likes: p.like_count || 0, reposts: p.repost_count || 0,
        liked: ls.has(p.id), reposted: repSet.has(p.id) || p.reposted_by === me, comments: allComments.filter(c => c.post_id === p.id).reverse(),
        ts: new Date(p.created_at).getTime(), reposted_by: p.reposted_by,
        quote_text: p.quote_text, is_sponsored: p.is_sponsored, original_post_id: p.original_post_id, original_uid
      }
    }));
    setLoading(false);
  }, [me, focusPostId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!focusPostId) return;
    setTab("For You");
    setActiveTag(null);
  }, [focusPostId]);

  useEffect(() => {
    const unsub = subscribeWS((msg) => {
      if (msg.type === "feed_event") {
        if (msg.action === "like") {
          setPosts(ps => ps.map(p => p.id === msg.postId ? { ...p, likes: msg.likes } : p));
        } else if (msg.action === "repost" || msg.action === "quote_repost") {
          // If it's a repost/quote, we just reload the feed for simplicity,
          // or we can increment the original post's count. Let's increment count:
          if (msg.originalPostId) {
            setPosts(ps => ps.map(p => p.id === msg.originalPostId ? { ...p, reposts: msg.reposts } : p));
          }
          // Also fetch the feed silently so the new post appears? Or just wait for refresh.
          // Since it's a new post row, running load() safely brings it in.
          // But to avoid flicker, we can just insert the basic post obj if provided:
          if (msg.newPostObj) {
            setPosts(ps => {
              if (ps.find(x => x.id === msg.newPostObj.id)) return ps;
              return [msg.newPostObj, ...ps];
            });
          }
        } else if (msg.action === "undo_repost") {
          if (msg.originalPostId) {
            setPosts(ps => ps.map(p => p.id === msg.originalPostId ? { ...p, reposts: msg.reposts } : p)
              .filter(p => p.id !== msg.deletedRepostId));
          }
        } else if (msg.action === "new_post") {
          if (msg.newPostObj) {
            setPosts(ps => {
              if (ps.find(x => x.id === msg.newPostObj.id)) return ps;
              const p = msg.newPostObj;
              const formatted = {
                id: p.id, uid: p.uid, text: p.text, media: p.media || [],
                hashtags: p.hashtags || [], location: p.location,
                likes: p.like_count || 0, reposts: p.repost_count || 0,
                liked: false, reposted: false, comments: [],
                ts: new Date(p.created_at || Date.now()).getTime(), reposted_by: p.reposted_by,
                quote_text: p.quote_text, is_sponsored: p.is_sponsored, original_post_id: p.original_post_id
              };
              return [formatted, ...ps];
            });
          }
        }
      }
    });
    return () => unsub();
  }, []);

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
    sendWSMessage({ type: "feed_event", action: "new_post", newPostObj: saved });
  };

  const syncLikeState = async (id) => {
    const state = likeManager.current.states[id];
    if (!state || state.syncing) return;

    if (state.currentLiked === state.initialLiked) {
      // User ended up in the same state, no sync needed
      return;
    }

    state.syncing = true;
    const targetLiked = state.currentLiked;

    try {
      if (targetLiked) {
        // Add Like
        await db.post("rs_post_likes", { post_id: id, uid: me });
        const postData = await db.get("rs_posts", `id=eq.${id}`);
        const freshCount = (postData?.[0]?.like_count || 0) + 1;
        await db.patch("rs_posts", `id=eq.${id}`, { like_count: freshCount });
        
        setPosts(ps => ps.map(x => x.id === id ? { ...x, liked: true, likes: freshCount } : x));
        sendWSMessage({ type: "feed_event", action: "like", postId: id, likes: freshCount });

        // Post notification if the post is not ours
        const postAuthor = postData?.[0]?.uid;
        if (postAuthor && postAuthor !== me) {
          try {
            await db.post("rs_notifications", {
              uid: postAuthor,
              type: "like",
              msg: `${myProfile?.name || "Someone"} liked your post`,
              post_id: id,
              profile_id: me,
              read: false
            });
          } catch {}
        }
      } else {
        // Remove Like
        await db.del("rs_post_likes", `post_id=eq.${id}&uid=eq.${me}`);
        const postData = await db.get("rs_posts", `id=eq.${id}`);
        const freshCount = Math.max(0, (postData?.[0]?.like_count || 0) - 1);
        await db.patch("rs_posts", `id=eq.${id}`, { like_count: freshCount });
        
        setPosts(ps => ps.map(x => x.id === id ? { ...x, liked: false, likes: freshCount } : x));
        sendWSMessage({ type: "feed_event", action: "like", postId: id, likes: freshCount });
      }

      state.initialLiked = targetLiked;
    } catch (e) {
      console.error("Like sync error:", e);
    } finally {
      state.syncing = false;
      // If state changed while syncing, trigger sync again
      if (state.currentLiked !== state.initialLiked) {
        syncLikeState(id);
      }
    }
  };

  const toggleLike = useCallback(id => {
    setPosts(ps => {
      const idx = ps.findIndex(x => x.id === id);
      if (idx === -1) return ps;
      const p = ps[idx];
      const newLiked = !p.liked;
      const newLikes = newLiked ? (p.likes + 1) : Math.max(0, p.likes - 1);

      if (!likeManager.current.states[id]) {
        likeManager.current.states[id] = {
          initialLiked: p.liked,
          currentLiked: newLiked,
          timer: null,
          syncing: false
        };
      } else {
        likeManager.current.states[id].currentLiked = newLiked;
      }

      const state = likeManager.current.states[id];
      if (state.timer) {
        clearTimeout(state.timer);
      }

      state.timer = setTimeout(() => {
        syncLikeState(id);
      }, 600);

      const updated = [...ps];
      updated[idx] = { ...p, liked: newLiked, likes: newLikes };
      return updated;
    });
  }, []);

  const doRepost = async orig => {
    if (orig.reposted) return;
    const nc = (orig.reposts || 0) + 1;
    const newPost = { ...orig, id: genId(), reposts: nc, liked: false, reposted: false, comments: [], ts: Date.now(), reposted_by: me, original_post_id: orig.id, original_uid: orig.uid };
    setPosts(ps => [newPost, ...ps.map(x => x.id === orig.id ? { ...x, reposts: nc, reposted: true } : x)]);
    try {
      await db.patch("rs_posts", `id=eq.${orig.id}`, { repost_count: nc });
      const saved = await db.post("rs_posts", { uid: me, text: orig.text, media: orig.media, hashtags: orig.hashtags, location: orig.location, like_count: 0, repost_count: 0, reposted_by: me, original_post_id: orig.id });
      if (!saved) throw new Error("Failed to post");
      addNotif({ type: "action", msg: "You reposted a signal" });
      sendWSMessage({ type: "feed_event", action: "repost", originalPostId: orig.id, reposts: nc, newPostObj: { ...newPost, id: saved.id } });
      if (orig.uid !== me) {
        try { await db.post("rs_notifications", { uid: orig.uid, type: "repost", msg: `${myProfile?.name || "Someone"} reposted your post`, post_id: orig.id, profile_id: me, read: false }); } catch (e) { console.error("Notification error:", e); }
      }
    } catch (err) {
      console.error(err);
      setPosts(ps => ps.filter(x => x.id !== newPost.id).map(x => x.id === orig.id ? { ...x, reposts: Math.max(0, nc - 1), reposted: false } : x));
      addNotif({ type: "error", msg: "Failed to repost" });
    }
  };

  const doQuoteRepost = async (orig, quoteText) => {
    if (orig.reposted) return;
    const nc = (orig.reposts || 0) + 1;
    const newPost = { ...orig, id: genId(), reposts: nc, liked: false, reposted: false, comments: [], ts: Date.now(), reposted_by: me, quote_text: quoteText, original_post_id: orig.id, original_uid: orig.uid };
    setPosts(ps => [newPost, ...ps.map(x => x.id === orig.id ? { ...x, reposts: nc, reposted: true } : x)]);
    try {
      await db.patch("rs_posts", `id=eq.${orig.id}`, { repost_count: nc });
      const saved = await db.post("rs_posts", { uid: me, text: orig.text, media: orig.media, hashtags: orig.hashtags, location: orig.location, like_count: 0, repost_count: 0, reposted_by: me, quote_text: quoteText, original_post_id: orig.id });
      if (!saved) throw new Error("Failed to post");
      addNotif({ type: "action", msg: "You quote-reposted a signal" });
      sendWSMessage({ type: "feed_event", action: "quote_repost", originalPostId: orig.id, reposts: nc, newPostObj: { ...newPost, id: saved.id } });
      if (orig.uid !== me) {
        try { await db.post("rs_notifications", { uid: orig.uid, type: "quote", msg: `${myProfile?.name || "Someone"} quote-reposted your post`, post_id: orig.id, profile_id: me, read: false }); } catch (e) { console.error("Notification error:", e); }
      }
    } catch (err) {
      console.error(err);
      setPosts(ps => ps.filter(x => x.id !== newPost.id).map(x => x.id === orig.id ? { ...x, reposts: Math.max(0, nc - 1), reposted: false } : x));
      addNotif({ type: "error", msg: "Failed to quote repost" });
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
    const oldRepostId = p.reposted_by === me ? p.id : id;
    await db.del("rs_posts", `original_post_id=eq.${origId}&reposted_by=eq.${me}`);
    sendWSMessage({ type: "feed_event", action: "undo_repost", originalPostId: origId, deletedRepostId: oldRepostId, reposts: nc });
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