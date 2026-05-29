// src/views/NetworkView.jsx
import { useState, useEffect } from "react";
import { T, ROLES, INT_OPTS } from "../config/constants.js";
import { genId } from "../utils/helpers.js";
import { db } from "../services/supabase.js";
import Spin from "../components/ui/Spin.jsx";
import Card from "../components/ui/Card.jsx";
import Av from "../components/ui/Av.jsx";
import SGN from "../components/ui/SGN.jsx";

function NetworkView({ me, dk, onProfile, bals, profiles, addNotif }) {
  const th = T(dk);
  const [aligned, setAligned] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const others = Object.values(profiles).filter(p => p.id !== me);
  const myProfile = profiles[me];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [alignRows, incomingRows, outgoingRows] = await Promise.all([
          db.get("rs_alignments", `follower_uid=eq.${me}`),
          db.get("rs_align_requests", `target_uid=eq.${me}&status=eq.pending&order=created_at.desc`),
          db.get("rs_align_requests", `requester_uid=eq.${me}&status=eq.pending&order=created_at.desc`),
        ]);
        if (cancelled) return;
        setAligned((alignRows || []).map(r => r.following_uid));
        setIncomingRequests(incomingRows || []);
        setOutgoingRequests(outgoingRows || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [me]);

  const alignedSet = new Set(aligned);
  const incomingByRequester = new Map(incomingRequests.map(req => [req.requester_uid, req]));
  const outgoingByTarget = new Set(outgoingRequests.map(req => req.target_uid));

  const sendRequest = async uid => {
    if (alignedSet.has(uid) || outgoingByTarget.has(uid)) return;
    const targetName = profiles[uid]?.name || "a member";
    const tempReq = {
      id: genId(),
      requester_uid: me,
      target_uid: uid,
      status: "pending",
      created_at: new Date().toISOString(),
    };

    setOutgoingRequests(prev => [tempReq, ...prev.filter(r => r.target_uid !== uid)]);
    await db.upsert("rs_align_requests", { requester_uid: me, target_uid: uid, status: "pending" });
    try { await db.post("rs_notifications", { uid, type: "align_request", msg: `📌 ${myProfile?.name || "Someone"} sent you an align request`, profile_id: me, requester_uid: me, target_uid: uid, read: false }); } catch {}
    addNotif?.({ type: "follow", msg: `📌 Align request sent to ${targetName}`, profile_id: uid });
  };

  const acceptRequest = async req => {
    const requesterName = profiles[req.requester_uid]?.name || "a member";
    setIncomingRequests(prev => prev.filter(r => r.id !== req.id));
    setAligned(prev => (prev.includes(req.requester_uid) ? prev : [...prev, req.requester_uid]));
    await Promise.all([
      db.upsert("rs_alignments", { follower_uid: me, following_uid: req.requester_uid }),
      db.upsert("rs_alignments", { follower_uid: req.requester_uid, following_uid: me }),
      db.patch("rs_align_requests", `id=eq.${req.id}`, { status: "accepted" }),
    ]);
    try { await db.post("rs_notifications", { uid: req.requester_uid, type: "align_accept", msg: `✅ ${myProfile?.name || "Someone"} accepted your align request`, profile_id: req.target_uid || me, requester_uid: req.requester_uid, target_uid: req.target_uid || me, read: false }); } catch {}
    addNotif?.({ type: "success", msg: `You accepted ${requesterName}'s align request`, profile_id: req.requester_uid });
  };

  const declineRequest = async req => {
    setIncomingRequests(prev => prev.filter(r => r.id !== req.id));
    await db.patch("rs_align_requests", `id=eq.${req.id}`, { status: "rejected" });
    addNotif?.({ type: "info", msg: `Align request from ${profiles[req.requester_uid]?.name || "a member"} declined`, profile_id: req.requester_uid });
  };

  const withdrawRequest = async uid => {
    const targetName = profiles[uid]?.name || "a member";
    setOutgoingRequests(prev => prev.filter(r => r.target_uid !== uid));
    await db.del("rs_align_requests", `requester_uid=eq.${me}&target_uid=eq.${uid}&status=eq.pending`);
    addNotif?.({ type: "info", msg: `⛓️ Align request to ${targetName} withdrawn` });
  };

  const toggle = async uid => {
    const on = alignedSet.has(uid);
    if (on) {
      setAligned(a => a.filter(x => x !== uid));
      await db.del("rs_alignments", `follower_uid=eq.${me}&following_uid=eq.${uid}`);
      return;
    }
    await sendRequest(uid);
  };

  const getFiltered = () => {
    if (filter === "requests") return incomingRequests;
    if (filter === "aligned") return others.filter(u => alignedSet.has(u.id));
    if (filter === "suggested") return others.filter(u => !alignedSet.has(u.id) && u.interests?.some(i => myProfile?.interests?.includes(i)));
    return others;
  };

  if (loading) return <Spin dk={dk} msg="Loading network…" />;

  const filtered = getFiltered();
  const requestCount = incomingRequests.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", paddingRight: 4 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: th.txt }}>People on RightSignal</h2>
      <p style={{ color: th.txt2, fontSize: 14, margin: "0 0 12px" }}>{others.length} member{others.length !== 1 ? "s" : ""} · Discover and align globally</p>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {[["all", "All"], ["requests", "Requests"], ["aligned", "Aligned"], ["suggested", "Suggested"]].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${filter === id ? "#3b82f6" : th.bdr}`, background: filter === id ? "#3b82f6" : "transparent", color: filter === id ? "#fff" : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <span>{label}</span>
            {id === "requests" && requestCount > 0 && <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99 }}>{requestCount}</span>}
          </button>
        ))}
      </div>
      {filtered.length === 0 && <p style={{ color: th.txt3, textAlign: "center", padding: 32 }}>No members in this category yet.</p>}
      {filter === "requests" ? filtered.map(req => {
        const requester = profiles[req.requester_uid] || { id: req.requester_uid, name: "Unknown" };
        const bal = bals[req.requester_uid] ?? 0;
        return (
          <Card dk={dk} key={req.id}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div onClick={() => onProfile(req.requester_uid)} style={{ cursor: "pointer" }}><Av profile={requester} size={48} bal={bal} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span onClick={() => onProfile(req.requester_uid)} style={{ fontWeight: 700, fontSize: 15, color: th.txt, cursor: "pointer" }}>{requester.name}</span>
                      {requester.verified && <span style={{ color: "#3b82f6", fontSize: 11 }}>✓</span>}
                      {bal > 0 && <SGN n={bal} size="sm" />}
                    </div>
                    {requester.handle && <div style={{ fontSize: 12, color: th.txt3 }}>@{requester.handle}</div>}
                    <div style={{ fontSize: 12, color: th.txt2, marginTop: 4 }}>sent you an align request</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button onClick={() => acceptRequest(req)} style={{ padding: "7px 14px", borderRadius: 10, border: "1.5px solid #16a34a", background: "#16a34a", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Accept</button>
                    <button onClick={() => declineRequest(req)} style={{ padding: "7px 14px", borderRadius: 10, border: `1.5px solid ${th.bdr}`, background: "transparent", color: th.txt2, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Decline</button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      }) : filtered.map(u => {
        const bal = bals[u.id] ?? 0;
        const on = alignedSet.has(u.id);
        const incoming = incomingByRequester.get(u.id);
        const requested = outgoingByTarget.has(u.id);
        const sharedInterests = u.interests?.filter(i => myProfile?.interests?.includes(i)) || [];
        return (
          <Card dk={dk} key={u.id}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div onClick={() => onProfile(u.id)} style={{ cursor: "pointer" }}><Av profile={u} size={48} bal={bal} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span onClick={() => onProfile(u.id)} style={{ fontWeight: 700, fontSize: 15, color: th.txt, cursor: "pointer" }}>{u.name}</span>
                      {u.verified && <span style={{ color: "#3b82f6", fontSize: 11 }}>✓</span>}
                      {u.system_role && u.system_role !== "user" && <span style={{ background: dk ? "rgba(59,130,246,.12)" : "#eff6ff", color: "#3b82f6", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99 }}>{ROLES[u.system_role]}</span>}
                      {bal > 0 && <SGN n={bal} size="sm" />}
                    </div>
                    {u.handle && <div style={{ fontSize: 12, color: th.txt3 }}>@{u.handle}</div>}
                    {u.bio && <div style={{ fontSize: 13, color: th.txt, marginTop: 3 }}>{u.bio}</div>}
                    {sharedInterests.length > 0 && <div style={{ fontSize: 11, color: "#10b981", marginTop: 4 }}>✓ {sharedInterests.length} shared interest{sharedInterests.length > 1 ? "s" : ""}</div>}
                  </div>
                  {incoming ? (
                    <button onClick={() => acceptRequest(incoming)} style={{ padding: "7px 18px", borderRadius: 10, border: "1.5px solid #16a34a", background: "#16a34a", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>Accept</button>
                  ) : requested ? (
                    <button
                      onClick={() => withdrawRequest(u.id)}
                      style={{
                        padding: "7px 18px",
                        borderRadius: 10,
                        border: `1px solid ${th.bdr}`,
                        background: dk ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.03)",
                        color: th.txt2,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        flexShrink: 0,
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = dk ? "rgba(239, 68, 68, 0.08)" : "rgba(239, 68, 68, 0.05)";
                        e.currentTarget.style.color = "#ef4444";
                        e.currentTarget.style.borderColor = dk ? "rgba(239, 68, 68, 0.25)" : "rgba(239, 68, 68, 0.2)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = dk ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.03)";
                        e.currentTarget.style.color = th.txt2;
                        e.currentTarget.style.borderColor = th.bdr;
                      }}
                    >
                      Requested
                    </button>
                  ) : (
                    <button onClick={() => toggle(u.id)} style={{ padding: "7px 18px", borderRadius: 10, border: `1.5px solid ${on ? "#555" : "#111"}`, background: on ? "#fff" : "#111", color: on ? "#111" : "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>{on ? "Aligned" : "Align"}</button>
                  )}
                </div>
                {u.interests?.length > 0 && (
                  <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
                    {u.interests.slice(0, 4).map(id => { const opt = INT_OPTS.find(x => x.id === id); return opt ? <span key={id} style={{ background: `${opt.c}18`, color: opt.c, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99 }}>{opt.label}</span> : null; })}
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
      </div>
    </div>
  );
}

export default NetworkView;