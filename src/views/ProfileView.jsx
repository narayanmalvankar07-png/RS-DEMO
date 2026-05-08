import { useState, useEffect } from "react";
import { ArrowLeft, MessageCircle, Heart, Edit3, Check, X, Rocket, TrendingUp, Briefcase, Zap, Code2, Palette, Globe, Brain, GraduationCap, Microscope, Sparkles, Building2, User } from "lucide-react";
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

export default function ProfileView({ uid, me, dk, onBack, bals, profiles, setBals, onMessage, addNotif }) {
  const th = T(dk);
  const profile = profiles[uid] || { name: "Unknown", handle: "unknown", bio: "No profile available." };
  const balance = bals[uid] ?? 0;
  const role = ROLES[profile.system_role] || "Member";
  const isOwnProfile = uid === me;
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editBio, setEditBio] = useState(profile.bio || "");
  const [editName, setEditName] = useState(profile.name || "");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("posts");

  useEffect(() => {
    setEditBio(profile.bio || "");
    setEditName(profile.name || "");
  }, [uid, profile.bio, profile.name]);

  useEffect(() => {
    setLoadingPosts(true);
    db.get("rs_posts", `uid=eq.${uid}&order=created_at.desc&limit=20`).then(d => {
      setPosts(d || []);
      setLoadingPosts(false);
    });
  }, [uid]);

  const saveProfile = async () => {
    setSaving(true);
    await db.patch("rs_user_profiles", `id=eq.${uid}`, { name: editName, bio: editBio });
    setSaving(false);
    setEditing(false);
  };

  const giveToken = async () => {
    const current = bals[uid] ?? 0;
    const newBal = current + 1;
    setBals(b => ({ ...b, [uid]: newBal }));
    await db.upsert("rs_token_balances", { uid, balance: newBal });
    await db.post("rs_token_txns", { uid, type: "earn", amount: 1, description: `Gift from ${profiles[me]?.name || "a member"}` });
    addNotif?.({ type: "token", msg: `◈ You gifted 1 SGN to ${profile.name}` });
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
          <Av profile={profile} size={80} bal={balance} />
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
            <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={3} style={{ width: "100%", background: th.inp, border: `1px solid ${th.inpB}`, borderRadius: 10, padding: "10px 12px", color: th.txt, outline: "none", fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
          ) : (
            <p style={{ margin: 0, color: th.txt2, fontSize: 14, lineHeight: 1.7 }}>{profile.bio || "No bio yet."}</p>
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

        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          {!isOwnProfile && (
            <>
              <button onClick={() => onMessage(uid)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                <MessageCircle size={15} />Message
              </button>
              <button onClick={giveToken} style={{ display: "flex", alignItems: "center", gap: 6, background: "#10b981", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                <Heart size={15} />Give +1 SGN
              </button>
            </>
          )}
          {isOwnProfile && !editing && (
            <button onClick={() => setEditing(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: th.surf2, color: th.txt, border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
              <Edit3 size={15} />Edit Profile
            </button>
          )}
          {isOwnProfile && editing && (
            <>
              <button onClick={saveProfile} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, background: "#10b981", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                <Check size={15} />{saving ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setEditing(false)} style={{ display: "flex", alignItems: "center", gap: 6, background: th.surf2, color: th.txt, border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontSize: 13 }}>
                <X size={15} />Cancel
              </button>
            </>
          )}
        </div>
      </Card>

      <div style={{ display: "flex", gap: 4, marginBottom: 14, background: th.surf2, borderRadius: 10, padding: 4, border: `1px solid ${th.bdr}` }}>
        {["posts", "about"].map(t => (
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
              <PostCard key={p.id} post={{ ...p, id: p.id, uid: p.uid, text: p.text, media: p.media || [], hashtags: p.hashtags || [], likes: p.like_count || 0, reposts: p.repost_count || 0, liked: false, comments: [], ts: new Date(p.created_at).getTime() }} me={me} onLike={() => {}} onRepost={() => {}} onQuoteRepost={() => {}} onComment={() => {}} onBookmark={() => {}} dk={dk} onProfile={() => {}} bals={bals} profiles={profiles} onTag={() => {}} bookmarks={[]} />
            ))}
          </div>
        )
      )}

      {tab === "about" && (
        <Card dk={dk} style={{ padding: 20 }}>
          <div style={{ display: "grid", gap: 14 }}>
            {[
              { label: "Email", value: profile.email },
              { label: "Role", value: whoOpt ? whoOpt.label : "—" },
              { label: "System Role", value: role },
              { label: "Referral Code", value: profile.ref_code || "—" },
            ].filter(x => x.value).map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: `1px solid ${th.bdr}` }}>
                <span style={{ fontSize: 13, color: th.txt3, fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 13, color: th.txt }}>{value}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
