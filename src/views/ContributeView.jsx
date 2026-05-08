import { useState, useEffect } from "react";
import { Pencil, TrendingUp, Zap, ThumbsUp, ThumbsDown, PlusCircle, X, Wrench, Lightbulb, FileText } from "lucide-react";
import { T, TYP_COLORS, SEED_CONTRIBS } from "../config/constants.js";
import { db } from "../services/supabase.js";
import Spin from "../components/ui/Spin.jsx";
import Card from "../components/ui/Card.jsx";

const TYPE_ICONS = { article: FileText, tool: Wrench, idea: Lightbulb };
const TYPE_LABELS = { article: "Article", tool: "Tool", idea: "Idea" };

export default function ContributeView({ me, dk, addNotif }) {
  const th = T(dk);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "idea", title: "", body: "" });
  const [submitting, setSubmitting] = useState(false);
  const [voted, setVoted] = useState({});

  useEffect(() => {
    (async () => {
      let data = await db.get("rs_contributions", "order=upvotes.desc");
      if (!data?.length) {
        await db.postMany("rs_contributions", SEED_CONTRIBS);
        data = await db.get("rs_contributions", "order=upvotes.desc") || [];
      }
      setContributions(data);
      setLoading(false);
    })();
  }, []);

  const vote = async (id, dir) => {
    if (voted[id]) return;
    const c = contributions.find(x => x.id === id);
    if (!c) return;
    const field = dir === "up" ? "upvotes" : "downvotes";
    const newVal = (c[field] || 0) + 1;
    setContributions(prev => prev.map(x => x.id === id ? { ...x, [field]: newVal } : x));
    setVoted(v => ({ ...v, [id]: dir }));
    await db.patch("rs_contributions", `id=eq.${id}`, { [field]: newVal });
  };

  const submit = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setSubmitting(true);
    const saved = await db.post("rs_contributions", { uid: me, ...form, upvotes: 0, downvotes: 0 });
    if (saved) {
      setContributions(prev => [saved, ...prev]);
      addNotif?.({ type: "success", msg: "✨ Contribution submitted!" });
      setForm({ type: "idea", title: "", body: "" });
      setShowForm(false);
    }
    setSubmitting(false);
  };

  const filtered = filter === "all" ? contributions : contributions.filter(c => c.type === filter);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: th.txt }}>Contribute</h2>
          <p style={{ margin: 0, color: th.txt3, fontSize: 13 }}>Share ideas, articles &amp; tools with the community</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} style={{ display: "flex", alignItems: "center", gap: 7, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 12, padding: "10px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
          <PlusCircle size={16} />New
        </button>
      </div>

      {showForm && (
        <Card dk={dk} style={{ marginBottom: 18, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: th.txt }}>New Contribution</div>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3 }}><X size={16} /></button>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {["idea", "article", "tool"].map(t => {
              const Icon = TYPE_ICONS[t];
              return (
                <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 20, border: `1px solid ${form.type === t ? TYP_COLORS[t] : th.bdr}`, background: form.type === t ? `${TYP_COLORS[t]}18` : "transparent", color: form.type === t ? TYP_COLORS[t] : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  <Icon size={13} />{TYPE_LABELS[t]}
                </button>
              );
            })}
          </div>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 14, boxSizing: "border-box", marginBottom: 10 }} />
          <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Share your idea, describe the article, or explain the tool..." rows={4} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, resize: "vertical", boxSizing: "border-box", marginBottom: 12 }} />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={submit} disabled={submitting} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#3b82f6", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </Card>
      )}

      <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
        {[["all", "All"], ["idea", "Ideas"], ["article", "Articles"], ["tool", "Tools"]].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} style={{ padding: "5px 13px", borderRadius: 20, border: `1px solid ${filter === id ? "#3b82f6" : th.bdr}`, background: filter === id ? "#3b82f618" : "transparent", color: filter === id ? "#3b82f6" : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{label}</button>
        ))}
      </div>

      {loading ? <Spin dk={dk} msg="Loading contributions…" /> : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: th.txt3 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✨</div>
          <p>No contributions yet. Be the first!</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map(c => {
            const color = TYP_COLORS[c.type] || "#6b7280";
            const Icon = TYPE_ICONS[c.type] || Pencil;
            const myVote = voted[c.id];
            const score = (c.upvotes || 0) - (c.downvotes || 0);
            return (
              <Card dk={dk} key={c.id} style={{ padding: 16 }}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => vote(c.id, "up")} style={{ background: myVote === "up" ? "#10b98120" : "transparent", border: "none", cursor: myVote ? "default" : "pointer", color: myVote === "up" ? "#10b981" : th.txt3, padding: "4px 6px", borderRadius: 6 }}><ThumbsUp size={14} /></button>
                    <span style={{ fontSize: 13, fontWeight: 800, color: score > 0 ? "#10b981" : score < 0 ? "#ef4444" : th.txt2 }}>{score}</span>
                    <button onClick={() => vote(c.id, "down")} style={{ background: myVote === "down" ? "#ef444420" : "transparent", border: "none", cursor: myVote ? "default" : "pointer", color: myVote === "down" ? "#ef4444" : th.txt3, padding: "4px 6px", borderRadius: 6 }}><ThumbsDown size={14} /></button>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: `${color}18`, color }}>
                        <Icon size={11} />{TYPE_LABELS[c.type] || c.type}
                      </span>
                      {c.uid === me && <span style={{ fontSize: 10, background: "#3b82f618", color: "#3b82f6", padding: "2px 7px", borderRadius: 99, fontWeight: 700 }}>Yours</span>}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: th.txt, marginBottom: 6 }}>{c.title}</div>
                    <p style={{ margin: 0, fontSize: 13, color: th.txt2, lineHeight: 1.6 }}>{c.body}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
