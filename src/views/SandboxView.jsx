import { useState, useEffect } from "react";
import { Lightbulb, PlusCircle, ArrowRight, Trophy, Star } from "lucide-react";
import { T, ST_LABEL, PH_LABEL, SB_CYCLE, SEED_SANDBOX, WHO_OPTS } from "../config/constants.js";
import { db } from "../services/supabase.js";
import Spin from "../components/ui/Spin.jsx";
import Card from "../components/ui/Card.jsx";

const STATUS_COLORS = {
  submitted: "#94a3b8", shortlisted_50: "#3b82f6", shortlisted_30: "#8b5cf6",
  shortlisted_15: "#f59e0b", finalist_10: "#f97316", winner: "#10b981", rejected: "#ef4444",
};

export default function SandboxView({ me, dk, myProfile, addNotif }) {
  const th = T(dk);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", problem: "", solution: "", audience: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      let data = await db.get("rs_sandbox", "order=created_at.desc");
      if (!data?.length) {
        await db.postMany("rs_sandbox", SEED_SANDBOX);
        data = await db.get("rs_sandbox", "order=created_at.desc") || [];
      }
      setEntries(data);
      setLoading(false);
    })();
  }, []);

  const submit = async () => {
    if (!form.title.trim() || !form.problem.trim()) return;
    setSubmitting(true);
    const saved = await db.post("rs_sandbox", { uid: me, ...form, status: "submitted", score_w1: null, score_w2: null, score_w3: null });
    if (saved) {
      setEntries(prev => [saved, ...prev]);
      addNotif?.({ type: "success", msg: "🚀 Startup idea submitted to Sandbox!" });
      setForm({ title: "", problem: "", solution: "", audience: "" });
      setShowForm(false);
    }
    setSubmitting(false);
  };

  const myEntry = entries.find(e => e.uid === me);
  const phases = ["all", "week1", "week2", "finalist_10", "winner"];

  const filtered = filter === "all" ? entries :
    filter === "week1" ? entries.filter(e => ["shortlisted_50", "submitted"].includes(e.status)) :
    filter === "week2" ? entries.filter(e => ["shortlisted_30", "shortlisted_15"].includes(e.status)) :
    entries.filter(e => e.status === filter);

  const scoreBar = (val, label) => val != null ? (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
      <span style={{ fontSize: 10, color: th.txt3, width: 50 }}>{label}</span>
      <div style={{ flex: 1, height: 5, borderRadius: 99, background: th.surf2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(val / 10) * 100}%`, borderRadius: 99, background: val >= 9 ? "#10b981" : val >= 7 ? "#3b82f6" : "#f59e0b", transition: "width .5s" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: th.txt2, width: 26 }}>{val}</span>
    </div>
  ) : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: th.txt }}>Startup Sandbox</h2>
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "#3b82f618", color: "#3b82f6", fontWeight: 700 }}>{SB_CYCLE.title}</span>
          </div>
          <p style={{ margin: 0, color: th.txt3, fontSize: 13 }}>
            Phase: <strong style={{ color: "#f59e0b" }}>{PH_LABEL[SB_CYCLE.phase]}</strong> · {entries.length} startup{entries.length !== 1 ? "s" : ""} in cohort
          </p>
        </div>
        {!myEntry && (
          <button onClick={() => setShowForm(v => !v)} style={{ display: "flex", alignItems: "center", gap: 7, background: "#3b82f6", color: "#fff", border: "none", borderRadius: 12, padding: "10px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            <PlusCircle size={16} />Submit Idea
          </button>
        )}
      </div>

      {showForm && (
        <Card dk={dk} style={{ marginBottom: 18, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: th.txt, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <Lightbulb size={18} color="#f59e0b" /> Submit Your Startup Idea
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { key: "title", placeholder: "Startup name", label: "Name *" },
              { key: "problem", placeholder: "What problem does it solve?", label: "Problem *" },
              { key: "solution", placeholder: "How does your solution work?", label: "Solution" },
              { key: "audience", placeholder: "Who is your target audience?", label: "Audience" },
            ].map(({ key, placeholder, label }) => (
              <div key={key}>
                <div style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 4 }}>{label}</div>
                <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
            <button onClick={() => setShowForm(false)} style={{ padding: "9px 16px", borderRadius: 10, border: `1px solid ${th.bdr}`, background: "transparent", color: th.txt2, cursor: "pointer", fontSize: 13 }}>Cancel</button>
            <button onClick={submit} disabled={submitting} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, border: "none", background: "#3b82f6", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
              {submitting ? "Submitting…" : <><ArrowRight size={14} />Submit</>}
            </button>
          </div>
        </Card>
      )}

      <div style={{ display: "flex", gap: 5, marginBottom: 14, flexWrap: "wrap" }}>
        {[["all", "All"], ["week1", "Week 1"], ["week2", "Week 2"], ["finalist_10", "Top 10"], ["winner", "Winners"]].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} style={{ padding: "5px 13px", borderRadius: 20, border: `1px solid ${filter === id ? "#3b82f6" : th.bdr}`, background: filter === id ? "#3b82f618" : "transparent", color: filter === id ? "#3b82f6" : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{label}</button>
        ))}
      </div>

      {loading ? <Spin dk={dk} msg="Loading cohort…" /> : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: th.txt3 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔬</div>
          <p>No startups in this phase yet.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {filtered.map(entry => {
            const statusColor = STATUS_COLORS[entry.status] || "#94a3b8";
            const isWinner = entry.status === "winner";
            const isFinalist = entry.status === "finalist_10";
            return (
              <Card dk={dk} key={entry.id} style={{ padding: 18, border: isWinner ? `1.5px solid #10b98140` : isFinalist ? `1.5px solid #f9741640` : undefined }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      {isWinner && <Trophy size={16} color="#10b981" />}
                      {isFinalist && <Star size={14} color="#f97316" />}
                      <span style={{ fontSize: 16, fontWeight: 800, color: th.txt }}>{entry.title}</span>
                      {entry.uid === me && <span style={{ fontSize: 10, background: "#3b82f618", color: "#3b82f6", padding: "2px 7px", borderRadius: 99, fontWeight: 700 }}>Your idea</span>}
                    </div>
                    {entry.audience && <span style={{ fontSize: 11, color: th.txt3 }}>👥 {entry.audience}</span>}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 99, background: `${statusColor}18`, color: statusColor, flexShrink: 0, marginLeft: 10 }}>{ST_LABEL[entry.status] || entry.status}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div style={{ background: th.surf2, borderRadius: 10, padding: "10px 12px", border: `1px solid ${th.bdr}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: th.txt3, marginBottom: 4 }}>PROBLEM</div>
                    <div style={{ fontSize: 13, color: th.txt, lineHeight: 1.5 }}>{entry.problem}</div>
                  </div>
                  <div style={{ background: th.surf2, borderRadius: 10, padding: "10px 12px", border: `1px solid ${th.bdr}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: th.txt3, marginBottom: 4 }}>SOLUTION</div>
                    <div style={{ fontSize: 13, color: th.txt, lineHeight: 1.5 }}>{entry.solution || "—"}</div>
                  </div>
                </div>
                {(entry.score_w1 != null || entry.score_w2 != null || entry.score_w3 != null) && (
                  <div style={{ background: th.surf2, borderRadius: 10, padding: "10px 12px", border: `1px solid ${th.bdr}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: th.txt3, marginBottom: 8 }}>EVALUATION SCORES</div>
                    {scoreBar(entry.score_w1, "Week 1")}
                    {scoreBar(entry.score_w2, "Week 2")}
                    {scoreBar(entry.score_w3, "Week 3")}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
