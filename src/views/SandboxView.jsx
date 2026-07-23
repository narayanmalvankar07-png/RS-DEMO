// src/views/SandboxView.jsx
import { useState, useEffect } from "react";
import { Lightbulb, PlusCircle, ArrowRight, Trophy, Star, ShieldCheck, Zap, Rocket, Users, Target, CheckCircle, Award } from "lucide-react";
import { T, ST_LABEL, PH_LABEL, SB_CYCLE } from "../config/constants.js";
import { db } from "../services/supabase.js";
import Spin from "../components/ui/Spin.jsx";
import Card from "../components/ui/Card.jsx";
import { toast } from "sonner";

const STATUS_COLORS = {
  submitted: "#94a3b8", shortlisted_50: "#3b82f6", shortlisted_30: "#8b5cf6",
  shortlisted_15: "#f59e0b", finalist_10: "#f97316", winner: "#10b981", rejected: "#ef4444",
  upcoming: "#8b5cf6",
};

export default function SandboxView({ me, dk, myProfile, addNotif, isMobile = false }) {
  const th = T(dk);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", problem: "", solution: "", audience: "", team_size: "1-3", demo_url: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await db.get("rs_sandbox", "order=created_at.desc");
        setEntries((data || []).filter(e => e.uid !== "seed"));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const submit = async () => {
    if (!form.title.trim() || !form.problem.trim()) {
      toast.error("Please fill in the startup title and problem statement.");
      return;
    }
    setSubmitting(true);
    const initialStatus = SB_CYCLE.isOpen ? "submitted" : "upcoming";
    const saved = await db.post("rs_sandbox", { uid: me, ...form, status: initialStatus, score_w1: null, score_w2: null, score_w3: null });
    const newEntry = saved || { id: `sb_${Date.now()}`, uid: me, ...form, status: initialStatus, created_at: new Date().toISOString() };

    setEntries(prev => [newEntry, ...prev]);
    const successMsg = SB_CYCLE.isOpen
      ? `🚀 Startup idea submitted to ${SB_CYCLE.title}!`
      : "🚀 Startup idea submitted for the upcoming cohort!";
    toast.success(successMsg);
    addNotif?.({ type: "success", msg: successMsg });
    setForm({ title: "", problem: "", solution: "", audience: "", team_size: "1-3", demo_url: "" });
    setShowForm(false);
    setSubmitting(false);
  };

  const myCurrentEntry = entries.find(e => e.uid === me && e.status !== "upcoming");
  const myUpcomingEntry = entries.find(e => e.uid === me && e.status === "upcoming");
  const hasSubmittedThisCohort = SB_CYCLE.isOpen ? !!myCurrentEntry : !!myUpcomingEntry;

  const filtered = filter === "all" ? entries :
    filter === "week1" ? entries.filter(e => ["shortlisted_50", "submitted"].includes(e.status)) :
      filter === "week2" ? entries.filter(e => ["shortlisted_30", "shortlisted_15"].includes(e.status)) :
        entries.filter(e => e.status === filter);

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Landing Hero Banner */}
      <div style={{
        background: dk
          ? "linear-gradient(135deg, rgba(30,58,138,0.3), rgba(91,33,182,0.25), rgba(6,182,212,0.15))"
          : "linear-gradient(135deg, #dbeafe, #ede9fe, #ccfbf1)",
        border: `1px solid ${dk ? "rgba(99,102,241,0.25)" : "#c7d2fe"}`,
        borderRadius: 24,
        padding: isMobile ? "24px 18px" : "32px 28px",
        marginBottom: 24,
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <span style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 99, letterSpacing: 0.5, textTransform: "uppercase" }}>
            INCUBATOR PROGRAM
          </span>
          <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 99, background: dk ? "rgba(255,255,255,0.08)" : "#fff", color: th.txt, fontWeight: 700, border: `1px solid ${th.bdr}` }}>
            {SB_CYCLE.title}
          </span>
        </div>

        <h1 style={{ margin: "0 0 10px", fontSize: isMobile ? 24 : 32, fontWeight: 900, color: th.txt, lineHeight: 1.2 }}>
          RightSignal Startup Sandbox
        </h1>
        <p style={{ margin: "0 0 20px", fontSize: isMobile ? 13 : 15, color: th.txt2, maxWidth: 620, lineHeight: 1.6 }}>
          Turn your raw idea into a venture-backed startup. Get 1-on-1 VC mentorship, free cloud credits, and pitch to top seed investors.
        </p>

        {/* Perks Grid */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { title: "₹5L Pool", desc: "Pitch Day Prize Money", icon: Trophy, c: "#f59e0b" },
            { title: "VC Mentors", desc: "1-on-1 Office Hours", icon: Users, c: "#3b82f6" },
            { title: "Cloud Credits", desc: "$10k AWS/GCP Credits", icon: Zap, c: "#8b5cf6" },
            { title: "Fast-Track", desc: "Direct VC Intro", icon: Rocket, c: "#10b981" },
          ].map(p => (
            <div key={p.title} style={{ background: dk ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.7)", border: `1px solid ${th.bdr}`, borderRadius: 16, padding: "12px 14px", backdropFilter: "blur(10px)" }}>
              <p.icon size={20} color={p.c} style={{ marginBottom: 6 }} />
              <div style={{ fontWeight: 800, fontSize: 14, color: th.txt }}>{p.title}</div>
              <div style={{ fontSize: 11, color: th.txt3, marginTop: 2 }}>{p.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: "12px 28px",
              borderRadius: 14,
              border: "none",
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 8px 24px rgba(99,102,241,0.35)",
            }}
          >
            <Rocket size={18} /> Apply to Sandbox Cohort →
          </button>
          <span style={{ fontSize: 12, color: th.txt3, fontWeight: 600 }}>
            Phase: <strong style={{ color: "#f59e0b" }}>{PH_LABEL[SB_CYCLE.phase]}</strong> · {entries.length} Startups in Program
          </span>
        </div>
      </div>

      {/* Program Workflow Timeline */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: th.txt, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <Target size={20} color="#3b82f6" /> How Sandbox Incubator Works
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 14 }}>
          {[
            { step: "01", title: "Idea & Screening", desc: "Submit your startup idea. Our panel screens applications into Top 50." },
            { step: "02", title: "4-Week Sprint", desc: "Build MVP, gather customer feedback, and refine pitch deck with mentors." },
            { step: "03", title: "Demo Day & Funding", desc: "Pitch to 30+ VCs and angels to win cash prizes and pre-seed term sheets." },
          ].map(s => (
            <Card key={s.step} dk={dk} style={{ padding: 18, position: "relative" }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: "#3b82f630", position: "absolute", top: 14, right: 16 }}>{s.step}</span>
              <h4 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: th.txt }}>{s.title}</h4>
              <p style={{ margin: 0, fontSize: 12, color: th.txt2, lineHeight: 1.5 }}>{s.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Application Form Drawer / Modal */}
      {showForm && (
        <Card dk={dk} style={{ marginBottom: 24, padding: 22, border: "1.5px solid #3b82f640" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: th.txt, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <Lightbulb size={20} color="#f59e0b" /> Apply to Sandbox Cohort
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 4, display: "block" }}>Startup Title *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. AI Workflow OS, PayPulse, HealthFlow"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 4, display: "block" }}>Problem Statement *</label>
              <textarea
                value={form.problem}
                onChange={e => setForm(f => ({ ...f, problem: e.target.value }))}
                placeholder="What core problem are you solving? Who suffers from this problem?"
                rows={3}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 4, display: "block" }}>Proposed Solution</label>
                <input
                  value={form.solution}
                  onChange={e => setForm(f => ({ ...f, solution: e.target.value }))}
                  placeholder="How does your product solve this problem?"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 4, display: "block" }}>Target Audience</label>
                <input
                  value={form.audience}
                  onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
                  placeholder="e.g. B2B SaaS Founders, Freelancers, Gen-Z Creators"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 4, display: "block" }}>Team Size</label>
                <select
                  value={form.team_size}
                  onChange={e => setForm(f => ({ ...f, team_size: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                >
                  <option value="Solo Founder">Solo Founder</option>
                  <option value="2-3 Co-founders">2-3 Co-founders</option>
                  <option value="4+ Team Members">4+ Team Members</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 4, display: "block" }}>Demo / Deck Link</label>
                <input
                  value={form.demo_url}
                  onChange={e => setForm(f => ({ ...f, demo_url: e.target.value }))}
                  placeholder="https://figma.com or https://pitch.com"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
            <button onClick={() => setShowForm(false)} style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${th.bdr}`, background: "transparent", color: th.txt2, fontSize: 13, cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={submit} disabled={submitting || !form.title.trim()} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              {submitting ? "Submitting…" : "Submit Application 🚀"}
            </button>
          </div>
        </Card>
      )}

      {/* Filter Tabs & Cohort Submissions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: th.txt, margin: 0 }}>
          Cohort Startup Submissions ({filtered.length})
        </h3>

        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {[
            ["all", "All"],
            ["week1", "Week 1"],
            ["week2", "Week 2"],
            ["finalist_10", "Top 10"],
            ["winner", "Winners"]
          ].map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} style={{ padding: "5px 13px", borderRadius: 20, border: `1px solid ${filter === id ? "#3b82f6" : th.bdr}`, background: filter === id ? "#3b82f618" : "transparent", color: filter === id ? "#3b82f6" : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <Spin dk={dk} msg="Loading cohort applications…" />
      ) : filtered.length === 0 ? (
        <Card dk={dk} style={{ textAlign: "center", padding: 48, color: th.txt3 }}>
          <Lightbulb size={36} style={{ opacity: 0.4, margin: "0 auto 10px" }} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: th.txt }}>No startups in this category yet</p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: th.txt3 }}>Click 'Apply to Sandbox Cohort' above to submit your startup idea!</p>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {filtered.map(entry => {
            const statusColor = STATUS_COLORS[entry.status] || "#94a3b8";
            const isWinner = entry.status === "winner";
            const isFinalist = entry.status === "finalist_10";

            return (
              <Card dk={dk} key={entry.id} style={{ padding: 18, border: isWinner ? `1.5px solid #10b98140` : isFinalist ? `1.5px solid #f9731640` : undefined }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      {isWinner && <Trophy size={16} color="#10b981" />}
                      {isFinalist && <Star size={14} color="#f97316" />}
                      <span style={{ fontSize: 16, fontWeight: 800, color: th.txt }}>{entry.title}</span>
                      {entry.uid === me && <span style={{ fontSize: 10, background: "#3b82f618", color: "#3b82f6", padding: "2px 7px", borderRadius: 99, fontWeight: 700 }}>Your idea</span>}
                    </div>
                    {entry.audience && <span style={{ fontSize: 11, color: th.txt3 }}>👥 Audience: {entry.audience}</span>}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 99, background: `${statusColor}18`, color: statusColor, flexShrink: 0 }}>
                    {ST_LABEL[entry.status] || entry.status}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                  <div style={{ background: th.surf2, borderRadius: 10, padding: "10px 12px", border: `1px solid ${th.bdr}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: th.txt3, marginBottom: 4 }}>PROBLEM</div>
                    <div style={{ fontSize: 13, color: th.txt, lineHeight: 1.5 }}>{entry.problem}</div>
                  </div>
                  <div style={{ background: th.surf2, borderRadius: 10, padding: "10px 12px", border: `1px solid ${th.bdr}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: th.txt3, marginBottom: 4 }}>SOLUTION</div>
                    <div style={{ fontSize: 13, color: th.txt, lineHeight: 1.5 }}>{entry.solution || "—"}</div>
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
