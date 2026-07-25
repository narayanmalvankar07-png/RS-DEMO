// src/views/SandboxView.jsx
import { useState, useEffect, useRef } from "react";
import {
  Lightbulb, PlusCircle, ArrowRight, Trophy, Star, ShieldCheck, Zap, Rocket, Users,
  Target, CheckCircle, CheckCircle2, Award, ChevronDown, ChevronUp, HelpCircle, Sparkles,
  Clock, FileText, Layers, Globe, DollarSign, GraduationCap, Briefcase, Code2, Palette,
  Brain, UserCheck, Check, ArrowDown, X, MessageSquare, ExternalLink, Linkedin, ArrowLeft
} from "lucide-react";
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

const AIM_OPTIONS = [
  { label: "Build MVP & Launch", value: "Build MVP & Launch" },
  { label: "Find Co-Founders / Team", value: "Find Co-Founders / Team" },
  { label: "Raise Seed / Angel Capital", value: "Raise Pre-Seed/Angel Capital" },
  { label: "Get 1-on-1 VC Mentorship", value: "Get VC Mentorship" },
  { label: "Validate Startup Idea", value: "Validate Startup Idea" }
];

const unwrapEntry = (item) => {
  if (!item) return null;
  if (Array.isArray(item)) return unwrapEntry(item[0]);
  return item;
};

export default function SandboxView({ me, dk, myProfile, addNotif, isMobile = false }) {
  const th = T(dk);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(true);
  const [step, setStep] = useState(1);
  const [openFaq, setOpenFaq] = useState(null);
  const formRef = useRef(null);

  const [form, setForm] = useState({
    title: "",
    problem: "",
    who_experiences: "",
    why_matters: "",
    solution: "",
    aim_goal: "Build MVP & Launch",
    why_me: "",
    audience: "",
    team_size: "Solo Founder",
    linkedin_url: "",
    demo_url: ""
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const activeUid = me || myProfile?.id;
        const data = await db.get("rs_sandbox", "order=created_at.desc");
        const remoteEntries = (data || []).map(unwrapEntry).filter(e => e && e.uid !== "seed");

        // Targeted fetch for current user's entry if not present in main list
        let userRemoteEntry = null;
        if (activeUid && !remoteEntries.some(e => String(e.uid) === String(activeUid))) {
          try {
            const userSpecificData = await db.get("rs_sandbox", `uid=eq.${activeUid}`);
            const userSpecificRow = (userSpecificData || []).map(unwrapEntry).filter(Boolean)[0];
            if (userSpecificRow) userRemoteEntry = userSpecificRow;
          } catch {}
        }

        let localEntries = [];
        try {
          const rawLocal = JSON.parse(localStorage.getItem("rs_sandbox_local_entries") || "[]");
          localEntries = rawLocal.map(unwrapEntry).filter(Boolean);
        } catch { }

        const combined = [...remoteEntries];
        if (userRemoteEntry && !combined.some(c => String(c.uid) === String(activeUid))) {
          combined.unshift(userRemoteEntry);
        }

        localEntries.forEach(loc => {
          if (!combined.some(c => (c.id && c.id === loc.id) || (c.uid && loc.uid && String(c.uid) === String(loc.uid)))) {
            combined.unshift(loc);
          }
        });

        setEntries(combined);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [me, myProfile?.id]);

  const activeUid = me || myProfile?.id;

  // Determine if current user has already submitted an application
  const localMyEntry = (() => {
    try {
      if (activeUid) {
        const item = localStorage.getItem(`rs_sandbox_sub_${activeUid}`);
        if (item) {
          const parsed = unwrapEntry(JSON.parse(item));
          if (parsed) return parsed;
        }
      }
      const rawLocal = JSON.parse(localStorage.getItem("rs_sandbox_local_entries") || "[]");
      const cleanLocal = rawLocal.map(unwrapEntry).filter(Boolean);
      return cleanLocal.find(e => activeUid && String(e.uid) === String(activeUid));
    } catch {
      return null;
    }
  })();

  const myExistingEntry = entries.map(unwrapEntry).filter(Boolean).find(e => activeUid && String(e.uid) === String(activeUid)) || localMyEntry;
  const hasAlreadySubmitted = !!myExistingEntry;

  const scrollToApply = () => {
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  // Calculate live completion percentage across all required fields
  const calculateProgress = () => {
    const requiredKeys = [
      "title", "problem", "who_experiences", "why_matters",
      "solution", "aim_goal", "why_me", "linkedin_url", "demo_url"
    ];
    let filledCount = 0;
    requiredKeys.forEach(k => {
      if (form[k] && form[k].trim() !== "") {
        filledCount += 1;
      }
    });
    return Math.round((filledCount / requiredKeys.length) * 100);
  };
  const progressPercent = calculateProgress();

  const nextStep = () => {
    if (step === 1) {
      if (!form.title.trim() || !form.problem.trim() || !form.who_experiences.trim() || !form.why_matters.trim()) {
        toast.error("Please fill in all mandatory fields in Step 1 to continue.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!form.solution.trim() || !form.aim_goal.trim() || !form.why_me.trim()) {
        toast.error("Please fill in all mandatory fields in Step 2 to continue.");
        return;
      }
      setStep(3);
    }
  };

  const prevStep = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  const submit = async () => {
    if (!activeUid) {
      toast.error("Please sign in to submit your application.");
      return;
    }

    if (hasAlreadySubmitted) {
      toast.error("You have already submitted an application for Sandbox Cohort 1.");
      return;
    }

    // Double-check backend DB before submitting
    try {
      const existing = await db.get("rs_sandbox", `uid=eq.${activeUid}`);
      const existingRow = (existing || []).map(unwrapEntry).filter(Boolean)[0];
      if (existingRow) {
        toast.error("You have already submitted an application for Sandbox Cohort 1.");
        try {
          localStorage.setItem(`rs_sandbox_sub_${activeUid}`, JSON.stringify(existingRow));
        } catch {}
        setEntries(prev => [existingRow, ...prev.map(unwrapEntry).filter(Boolean).filter(e => String(e.uid) !== String(activeUid))]);
        return;
      }
    } catch (e) {
      console.error("Error verifying prior submission:", e);
    }

    if (!form.title.trim() || !form.problem.trim() || !form.who_experiences.trim() || !form.why_matters.trim()) {
      toast.error("Please fill in all mandatory fields in Step 1.");
      setStep(1);
      return;
    }
    if (!form.solution.trim() || !form.aim_goal.trim() || !form.why_me.trim()) {
      toast.error("Please fill in all mandatory fields in Step 2.");
      setStep(2);
      return;
    }
    if (!form.linkedin_url.trim() || !form.demo_url.trim()) {
      toast.error("Please fill in your LinkedIn Profile URL and Demo/Deck link.");
      return;
    }

    setSubmitting(true);
    const initialStatus = SB_CYCLE.isOpen ? "submitted" : "upcoming";
    const payload = {
      uid: activeUid,
      ...form,
      status: initialStatus,
      score_w1: null, score_w2: null, score_w3: null
    };

    let saved = null;
    try {
      saved = await db.post("rs_sandbox", payload);
    } catch (e) {
      console.error("Supabase sandbox post error:", e);
    }

    const unwrappedSaved = unwrapEntry(saved);
    const newEntry = unwrappedSaved || {
      id: `sb_${Date.now()}`,
      created_at: new Date().toISOString(),
      ...payload
    };

    // Save to localStorage immediately so reloads retain single-submission status
    try {
      if (activeUid) {
        localStorage.setItem(`rs_sandbox_sub_${activeUid}`, JSON.stringify(newEntry));
      }
      const rawLocal = JSON.parse(localStorage.getItem("rs_sandbox_local_entries") || "[]");
      const cleanLocal = rawLocal.map(unwrapEntry).filter(Boolean);
      const updatedLocal = [newEntry, ...cleanLocal.filter(e => String(e.uid) !== String(activeUid))];
      localStorage.setItem("rs_sandbox_local_entries", JSON.stringify(updatedLocal));
    } catch (e) {
      console.error("Failed to write submission to localStorage", e);
    }

    setEntries(prev => [newEntry, ...prev.map(unwrapEntry).filter(Boolean).filter(e => String(e.uid) !== String(activeUid))]);
    const successMsg = "You've successfully joined the Sandbox Cohort 1 Waitlist!";
    toast.success(successMsg);
    addNotif?.({ type: "success", msg: successMsg });
    setForm({
      title: "", problem: "", who_experiences: "", why_matters: "",
      solution: "", aim_goal: "Build MVP & Launch", why_me: "", audience: "",
      team_size: "Solo Founder", linkedin_url: "", demo_url: ""
    });
    setStep(1);
    setSubmitting(false);
  };

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const filtered = filter === "all" ? entries :
    filter === "week1" ? entries.filter(e => ["shortlisted_50", "submitted"].includes(e.status)) :
      filter === "week2" ? entries.filter(e => ["shortlisted_30", "shortlisted_15"].includes(e.status)) :
        entries.filter(e => e.status === filter);

  const faqs = [
    { q: "Is Sandbox free?", a: "Yes. Participation is completely free. No fees, no equity taken." },
    { q: "Do I need a team before applying?", a: "No. If you're selected, you'll have the opportunity to connect with developers, designers, and marketers in the RightSignal community during Week 2." },
    { q: "Can I apply with just an idea?", a: "Absolutely. That's exactly what Sandbox is designed for. We help you take it from idea to launch." },
    { q: "What do I need to build?", a: "A working prototype, MVP, or technical proof of concept that demonstrates your solution during the 48-hour build sprint." },
    { q: "Who evaluates the startups?", a: "A panel of experienced founders, operators, investors, and industry mentors." },
    { q: "Do winners receive funding?", a: "Top-performing startups receive funding opportunities, 1-on-1 VC mentorship, platform benefits, and continued support from RightSignal." }
  ];

  return (
    <div style={{ paddingBottom: 50 }}>
      {/* ================= HERO SECTION ================= */}
      <div style={{
        background: dk
          ? "linear-gradient(135deg, rgba(30, 58, 138, 0.4), rgba(88, 28, 135, 0.35), rgba(15, 23, 42, 0.9))"
          : "linear-gradient(135deg, #e0e7ff, #f3e8ff, #ccfbf1)",
        border: `1px solid ${dk ? "rgba(99, 102, 241, 0.3)" : "#c7d2fe"}`,
        borderRadius: 24,
        padding: isMobile ? "24px 16px" : "32px 28px",
        marginBottom: 24,
        position: "relative",
        overflow: "hidden",
        boxShadow: dk ? "0 12px 30px rgba(0,0,0,0.4)" : "0 12px 24px rgba(99,102,241,0.06)"
      }}>
        {/* Glow decoration */}
        <div style={{
          position: "absolute", top: -60, right: -60, width: 220, height: 220,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, rgba(0,0,0,0) 70%)",
          pointerEvents: "none"
        }} />

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <span style={{
            background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff",
            fontSize: 10, fontWeight: 800, padding: "4px 12px", borderRadius: 99,
            letterSpacing: 0.5, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5
          }}>
            <Rocket size={12} /> RightSignal Sandbox
          </span>
          <span style={{
            fontSize: 11, padding: "4px 12px", borderRadius: 99,
            background: dk ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.85)",
            color: th.txt, fontWeight: 700, border: `1px solid ${th.bdr}`
          }}>
            {SB_CYCLE.title} · Coming Soon
          </span>
        </div>

        <h1 style={{
          margin: "0 0 10px", fontSize: isMobile ? 22 : 28, fontWeight: 900,
          color: th.txt, lineHeight: 1.2, letterSpacing: "-0.01em"
        }}>
          From Idea to Startup in 4 Weeks.
        </h1>

        <p style={{
          margin: "0 0 16px", fontSize: isMobile ? 12 : 14, color: th.txt2,
          maxWidth: 620, lineHeight: 1.55, fontWeight: 400
        }}>
          A free startup-building challenge where aspiring entrepreneurs transform ideas into working prototypes,
          compete with the best builders, and earn funding, mentorship, and global recognition.
        </p>

        <div style={{
          display: "inline-block", background: dk ? "rgba(16, 185, 129, 0.15)" : "#d1fae5",
          color: dk ? "#34d399" : "#065f46", border: `1px solid ${dk ? "rgba(16, 185, 129, 0.3)" : "#a7f3d0"}`,
          borderRadius: 10, padding: "5px 12px", fontSize: 12, fontWeight: 800, marginBottom: 20
        }}>
          No fees. No equity. Just execution.
        </div>

        {/* Perks Bar */}
        <div style={{
          display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: 10, marginBottom: 20
        }}>
          {[
            { title: "4-Week Challenge", desc: "Structured build cycle", icon: Rocket, c: "#3b82f6" },
            { title: "100% Free", desc: "No fees & zero equity", icon: ShieldCheck, c: "#10b981" },
            { title: "Funding & Rewards", desc: "Pitch day capital & perks", icon: Trophy, c: "#f59e0b" },
            { title: "VC Mentorship", desc: "1-on-1 industry guidance", icon: Users, c: "#8b5cf6" },
          ].map(p => (
            <div key={p.title} style={{
              background: dk ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.75)",
              border: `1px solid ${th.bdr}`, borderRadius: 14, padding: "10px 12px",
              backdropFilter: "blur(12px)"
            }}>
              <p.icon size={18} color={p.c} style={{ marginBottom: 6 }} />
              <div style={{ fontWeight: 800, fontSize: 13, color: th.txt }}>{p.title}</div>
              <div style={{ fontSize: 11, color: th.txt3, marginTop: 2 }}>{p.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={scrollToApply}
            style={{
              padding: "10px 24px",
              borderRadius: 12,
              border: "none",
              background: hasAlreadySubmitted ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #2563eb, #7c3aed)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: hasAlreadySubmitted ? "0 6px 20px rgba(16,185,129,0.3)" : "0 6px 20px rgba(79, 70, 229, 0.35)",
              transition: "transform 0.2s ease"
            }}
          >
            {hasAlreadySubmitted ? <CheckCircle size={16} /> : <Rocket size={16} />}
            {hasAlreadySubmitted ? "Already Joined Waitlist ✓" : "Join Waitlist"}
          </button>
          <div style={{ fontSize: 11, color: th.txt3, fontStyle: "italic", fontWeight: 600 }}>
            {hasAlreadySubmitted ? "Your application is submitted for evaluation" : "Applications Opening Soon · Join Waitlist"}
          </div>
        </div>
      </div>


      {/* ================= WHAT IS SANDBOX? ================= */}
      <Card dk={dk} style={{ padding: isMobile ? 16 : 24, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Lightbulb size={20} color="#f59e0b" />
          <h2 style={{ fontSize: 18, fontWeight: 900, color: th.txt, margin: 0 }}>What is Sandbox?</h2>
        </div>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#6366f1", margin: "0 0 12px" }}>
          Your startup deserves more than just an idea.
        </h3>

        <div style={{ display: "grid", gap: 10, fontSize: 13, color: th.txt2, lineHeight: 1.6 }}>
          <p style={{ margin: 0, fontWeight: 600, color: th.txt }}>
            Every great company begins with a problem worth solving.
          </p>
          <p style={{ margin: 0 }}>
            Sandbox is RightSignal's 4-week startup challenge designed for aspiring entrepreneurs who are ready to stop planning and start building.
          </p>
          <p style={{ margin: 0 }}>
            Over four weeks, selected participants will validate ideas, build teams, create working prototypes, pitch to experienced judges, and compete for funding and exclusive growth opportunities.
          </p>
        </div>

        <div style={{
          marginTop: 16, paddingTop: 12, borderTop: `1px dashed ${th.bdr}`,
          display: "flex", alignItems: "center", gap: 6
        }}>
          <CheckCircle2 size={16} color="#10b981" />
          <span style={{ fontSize: 12, fontWeight: 800, color: "#10b981" }}>
            Completely free to participate.
          </span>
        </div>
      </Card>


      {/* ================= HOW IT WORKS ================= */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: th.txt, margin: "0 0 4px" }}>
            How It Works
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: th.txt3 }}>
            From submission to demo day in 4 structured steps
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 14 }}>
          {/* Week 1 */}
          <Card dk={dk} style={{ padding: 18, position: "relative", borderLeft: "4px solid #3b82f6" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ background: "#3b82f618", color: "#3b82f6", fontWeight: 800, fontSize: 11, padding: "3px 10px", borderRadius: 99 }}>
                WEEK 1
              </span>
              <FileText size={18} color="#3b82f6" />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: th.txt, margin: "0 0 8px" }}>
              Submit Your Idea
            </h3>
            <p style={{ fontSize: 12, color: th.txt2, marginBottom: 8, fontWeight: 600 }}>
              Fill out a short application describing:
            </p>
            <ul style={{ margin: "0 0 12px", paddingLeft: 16, fontSize: 12, color: th.txt2, lineHeight: 1.5 }}>
              <li>What problem are you solving?</li>
              <li>Who experiences this problem?</li>
              <li>Why does it matter?</li>
              <li>How will you solve it?</li>
              <li>Why are you the right person to build it?</li>
            </ul>
            <div style={{ fontSize: 11, background: th.surf2, padding: 8, borderRadius: 8, color: th.txt3 }}>
              Our evaluation team reviews every submission. Only the strongest ideas move forward.
            </div>
          </Card>

          {/* Week 2 */}
          <Card dk={dk} style={{ padding: 18, position: "relative", borderLeft: "4px solid #8b5cf6" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ background: "#8b5cf618", color: "#8b5cf6", fontWeight: 800, fontSize: 11, padding: "3px 10px", borderRadius: 99 }}>
                WEEK 2
              </span>
              <Users size={18} color="#8b5cf6" />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: th.txt, margin: "0 0 8px" }}>
              Build Your Dream Team
            </h3>
            <p style={{ fontSize: 12, color: th.txt2, marginBottom: 8 }}>
              Selected founders appear on the RightSignal Leaderboard. Now the community comes alive.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
              {["Developers", "Designers", "Marketers", "Product thinkers", "Business strategists"].map(role => (
                <span key={role} style={{ fontSize: 10, fontWeight: 700, background: dk ? "rgba(255,255,255,0.08)" : "#f1f5f9", color: th.txt, padding: "2px 8px", borderRadius: 6 }}>
                  {role}
                </span>
              ))}
            </div>
            <p style={{ fontSize: 12, color: th.txt2, margin: "0 0 10px" }}>
              Participants can connect through RightSignal and form teams around the ideas they believe in.
            </p>
            <div style={{ fontSize: 11, background: th.surf2, padding: 8, borderRadius: 8, color: th.txt3, fontStyle: "italic" }}>
              Great startups aren't built alone.
            </div>
          </Card>

          {/* Week 3 */}
          <Card dk={dk} style={{ padding: 18, position: "relative", borderLeft: "4px solid #f59e0b" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ background: "#f59e0b18", color: "#f59e0b", fontWeight: 800, fontSize: 11, padding: "3px 10px", borderRadius: 99 }}>
                WEEK 3
              </span>
              <Zap size={18} color="#f59e0b" />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: th.txt, margin: "0 0 8px" }}>
              Build, Launch & Validate
            </h3>
            <p style={{ fontSize: 12, color: th.txt2, marginBottom: 8, fontWeight: 700 }}>
              It's time to execute. Every selected team gets 48 hours to build:
            </p>
            <ul style={{ margin: "0 0 10px", paddingLeft: 16, fontSize: 12, color: th.txt2, lineHeight: 1.5 }}>
              <li>MVP</li>
              <li>Prototype</li>
              <li>Technical proof of concept</li>
            </ul>
            <p style={{ fontSize: 12, color: th.txt2, marginBottom: 10, lineHeight: 1.4 }}>
              Once your MVP is ready, launch it into the market to validate with real users, collect feedback, onboard early adopters, and refine product before Demo Day.
            </p>
            <div style={{ fontSize: 11, background: th.surf2, padding: 8, borderRadius: 8, color: th.txt, fontWeight: 700 }}>
              Ideas become products. Products become startups.
            </div>
          </Card>

          {/* Week 4 */}
          <Card dk={dk} style={{ padding: 18, position: "relative", borderLeft: "4px solid #10b981" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ background: "#10b98118", color: "#10b981", fontWeight: 800, fontSize: 11, padding: "3px 10px", borderRadius: 99 }}>
                WEEK 4
              </span>
              <Trophy size={18} color="#10b981" />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: th.txt, margin: "0 0 8px" }}>
              Demo Day
            </h3>
            <ul style={{ margin: "0 0 12px", paddingLeft: 16, fontSize: 12, color: th.txt2, lineHeight: 1.5 }}>
              <li>Present your startup to an expert judging panel.</li>
              <li>Receive feedback from veteran investors & founders.</li>
              <li>Compete for the top positions.</li>
            </ul>
            <div style={{ fontSize: 11, background: th.surf2, padding: 8, borderRadius: 8, color: th.txt3 }}>
              The highest-ranked startups earn exclusive rewards and continued support from RightSignal.
            </div>
          </Card>
        </div>
      </div>


      {/* ================= TIMELINE ================= */}
      <Card dk={dk} style={{ padding: isMobile ? 16 : 22, marginBottom: 28 }}>
        <h2 style={{ fontSize: 17, fontWeight: 900, color: th.txt, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
          <Clock size={18} color="#3b82f6" /> Timeline Overview
        </h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
          gap: 10, position: "relative"
        }}>
          {[
            { week: "Week 1", title: "Idea Submission", desc: "Application & screening", c: "#3b82f6" },
            { week: "Week 2", title: "Team Formation", desc: "Recruit & connect", c: "#8b5cf6" },
            { week: "Week 3", title: "48-Hour Build Sprint", desc: "MVP & market validation", c: "#f59e0b" },
            { week: "Week 4", title: "Demo Day & Winners", desc: "Pitch & win funding", c: "#10b981" },
          ].map((item) => (
            <div key={item.week} style={{
              background: th.surf2, borderRadius: 12, padding: 12,
              border: `1px solid ${th.bdr}`, position: "relative"
            }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: item.c, textTransform: "uppercase", marginBottom: 2 }}>
                {item.week}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: item.title === "Idea Submission" ? th.txt : th.txt, marginBottom: 2 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 11, color: th.txt3 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </Card>


      {/* ================= REWARDS ================= */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: th.txt, margin: "0 0 4px" }}>
            Rewards
          </h2>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#6366f1" }}>
            More Than Just Winning
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: th.txt3 }}>
            The best startups receive direct access, support, and ecosystem perks
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 10 }}>
          {[
            { icon: Trophy, title: "RightSignal Leaderboard", desc: "Recognition on the official RightSignal Leaderboard", c: "#f59e0b" },
            { icon: DollarSign, title: "Funding Opportunities", desc: "Direct access to seed investment & angel networks", c: "#10b981" },
            { icon: Target, title: "Funding Section Access", desc: "Direct access to the RightSignal Funding portal", c: "#ef4444" },
            { icon: Users, title: "Expert Mentorship", desc: "Mentorship from experienced founders & industry leaders", c: "#8b5cf6" },
            { icon: Star, title: "Platform Benefits", desc: "One year of premium platform benefits & cloud credits", c: "#3b82f6" },
            { icon: Globe, title: "Global Exposure", desc: "Global exposure within the RightSignal ecosystem", c: "#06b6d4" },
          ].map(r => (
            <Card key={r.title} dk={dk} style={{ padding: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{
                background: `${r.c}18`, color: r.c, padding: 8, borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
              }}>
                <r.icon size={18} />
              </div>
              <div>
                <h4 style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 800, color: th.txt }}>{r.title}</h4>
                <p style={{ margin: 0, fontSize: 11, color: th.txt2, lineHeight: 1.4 }}>{r.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>


      {/* ================= WHO SHOULD APPLY? ================= */}
      <Card dk={dk} style={{ padding: isMobile ? 16 : 22, marginBottom: 28, background: dk ? "rgba(99,102,241,0.05)" : "#f8fafc" }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: th.txt, margin: "0 0 8px" }}>
          Who Should Apply?
        </h2>
        <div style={{ fontSize: 13, color: th.txt2, lineHeight: 1.5, marginBottom: 16 }}>
          You don't need a company. You don't need funding. You don't even need a team.<br />
          <strong>You only need a problem worth solving.</strong>
        </div>

        <div style={{ fontWeight: 800, fontSize: 11, color: th.txt3, marginBottom: 10 }}>
          PERFECT FOR:
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[
            { label: "Students", icon: GraduationCap },
            { label: "First-time founders", icon: Rocket },
            { label: "Engineers", icon: Code2 },
            { label: "Designers", icon: Palette },
            { label: "Product Managers", icon: Target },
            { label: "Working professionals", icon: Briefcase },
            { label: "Solo builders", icon: Brain }
          ].map(p => (
            <div key={p.label} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: dk ? "rgba(255,255,255,0.08)" : "#fff",
              border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "6px 12px",
              fontSize: 12, fontWeight: 700, color: th.txt,
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
            }}>
              <CheckCircle size={14} color="#10b981" />
              <span>{p.label}</span>
            </div>
          ))}
        </div>
      </Card>


      {/* ================= EVALUATION CRITERIA ================= */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: th.txt, margin: "0 0 4px" }}>
          Evaluation Criteria
        </h2>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: th.txt3 }}>
          Every submission is evaluated on the following 5 key pillars:
        </p>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(5, 1fr)", gap: 8, marginBottom: 10 }}>
          {[
            { title: "Problem Significance", desc: "Clear definition and impact of problem", c: "#ef4444" },
            { title: "Innovation", desc: "Uniqueness and novelty of solution", c: "#3b82f6" },
            { title: "Market Potential", desc: "Scalability and total opportunity", c: "#10b981" },
            { title: "Founder Clarity", desc: "Understanding of market & vision", c: "#8b5cf6" },
            { title: "Execution Capability", desc: "Ability to deliver functional MVP", c: "#f59e0b" },
          ].map((c, i) => (
            <Card key={c.title} dk={dk} style={{ padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: c.c, marginBottom: 2 }}>0{i + 1}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: th.txt, marginBottom: 3 }}>{c.title}</div>
              <div style={{ fontSize: 10, color: th.txt3, lineHeight: 1.3 }}>{c.desc}</div>
            </Card>
          ))}
        </div>

        <div style={{ fontSize: 12, color: th.txt2, fontStyle: "italic", textAlign: "center" }}>
          The strongest startups move forward each week.
        </div>
      </div>


      {/* ================= WHY JOIN? ================= */}
      <div style={{
        background: dk ? "linear-gradient(135deg, rgba(88,28,135,0.3), rgba(30,58,138,0.3))" : "linear-gradient(135deg, #ede9fe, #dbeafe)",
        border: `1px solid ${dk ? "rgba(139,92,246,0.3)" : "#c7d2fe"}`,
        borderRadius: 20, padding: isMobile ? 18 : 24, marginBottom: 28, textAlign: "center"
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: th.txt, margin: "0 0 8px" }}>
          Why Join?
        </h2>
        <p style={{ fontSize: 13, fontWeight: 700, color: th.txt2, margin: "0 0 12px" }}>
          Most startup competitions end with a certificate. <span style={{ color: "#8b5cf6" }}>Sandbox is different.</span>
        </p>

        <div style={{
          display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap",
          fontSize: 13, fontWeight: 800, color: th.txt, marginBottom: 14
        }}>
          <span>Validate it.</span> •
          <span>Build it.</span> •
          <span>Launch it.</span> •
          <span>Present it.</span>
        </div>

        <p style={{ margin: "0 auto", fontSize: 12, color: th.txt2, maxWidth: 540, lineHeight: 1.5 }}>
          And if your execution stands out, RightSignal continues supporting your journey beyond the competition.
        </p>
      </div>


      {/* ================= FREQUENTLY ASKED QUESTIONS ================= */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: th.txt, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 6 }}>
          <HelpCircle size={18} color="#3b82f6" /> Frequently Asked Questions
        </h2>

        <div style={{ display: "grid", gap: 8 }}>
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={faq.q} style={{
                background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 14,
                overflow: "hidden", transition: "all 0.2s ease"
              }}>
                <button
                  onClick={() => toggleFaq(idx)}
                  style={{
                    width: "100%", padding: "12px 16px", background: "transparent", border: "none",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    cursor: "pointer", textAlign: "left", color: th.txt, fontSize: 13, fontWeight: 700
                  }}
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp size={16} color={th.txt3} /> : <ChevronDown size={16} color={th.txt3} />}
                </button>
                {isOpen && (
                  <div style={{ padding: "0 16px 12px", fontSize: 12, color: th.txt2, lineHeight: 1.5, borderTop: `1px solid ${th.bdr2}` }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>


      {/* ================= FINAL CTA ================= */}
      <div style={{
        background: "linear-gradient(135deg, #1e1b4b, #312e81, #4338ca)",
        borderRadius: 24, padding: isMobile ? "24px 16px" : "32px 28px",
        color: "#fff", textAlign: "center", marginBottom: 32, boxShadow: "0 14px 30px rgba(49, 46, 129, 0.35)"
      }}>
        <h2 style={{ fontSize: isMobile ? 18 : 24, fontWeight: 900, margin: "0 0 10px", lineHeight: 1.25 }}>
          Great Companies Begin With Someone Who Decides to Start.
        </h2>
        <p style={{ fontSize: 13, opacity: 0.9, maxWidth: 500, margin: "0 auto 16px" }}>
          Your idea could become the next startup people talk about. The only question is—
          <strong style={{ color: "#38bdf8", display: "block", marginTop: 2 }}>Will you build it?</strong>
        </p>

        <button
          onClick={scrollToApply}
          style={{
            padding: "12px 28px", borderRadius: 14, border: "none",
            background: "#fff", color: "#312e81", fontWeight: 900, fontSize: 14,
            cursor: "pointer", boxShadow: "0 6px 18px rgba(255,255,255,0.2)"
          }}
        >
          {hasAlreadySubmitted ? "Already Joined Waitlist ✓" : "Join Waitlist"}
        </button>
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 8, fontStyle: "italic" }}>
          {hasAlreadySubmitted ? "Application recorded" : "Join waitlist now for early access."}
        </div>
      </div>


      {/* ================= INTERACTIVE MULTI-STEP WAITLIST FORM / SUBMITTED CARD ================= */}
      <div ref={formRef} style={{ scrollMarginTop: 90, marginBottom: 32 }}>
        {hasAlreadySubmitted ? (
          <Card dk={dk} style={{ padding: isMobile ? 20 : 28, border: "1.5px solid #10b981", background: dk ? "rgba(16, 185, 129, 0.05)" : "#f0fdf4" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <CheckCircle size={24} color="#10b981" />
              <h2 style={{ fontSize: 18, fontWeight: 900, color: th.txt, margin: 0 }}>
                Waitlist Application Received!
              </h2>
            </div>
            <p style={{ fontSize: 13, color: th.txt2, margin: "0 0 16px", lineHeight: 1.5 }}>
              You have already registered your startup <strong>"{myExistingEntry.title}"</strong> for Sandbox Cohort 1. You cannot submit multiple applications for the same cohort.
            </p>

            <div style={{ background: th.surf, borderRadius: 14, padding: 16, border: `1px solid ${th.bdr}`, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: th.txt }}>{myExistingEntry.title}</div>
                <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 99, background: "#10b98118", color: "#10b981" }}>
                  {ST_LABEL[myExistingEntry.status] || "Submitted"}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, fontSize: 12 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: th.txt3, marginBottom: 2 }}>PROBLEM</div>
                  <div style={{ color: th.txt }}>{myExistingEntry.problem}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: th.txt3, marginBottom: 2 }}>SOLUTION</div>
                  <div style={{ color: th.txt }}>{myExistingEntry.solution || "—"}</div>
                </div>
              </div>

              {myExistingEntry.aim_goal && (
                <div style={{ fontSize: 12, color: th.txt2, marginTop: 4 }}>
                  <strong>Goal:</strong> {myExistingEntry.aim_goal}
                </div>
              )}
            </div>
          </Card>
        ) : showForm && (
          <Card dk={dk} style={{ padding: isMobile ? 18 : 24, border: "1.5px solid #6366f1", boxShadow: "0 10px 30px rgba(99,102,241,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: th.txt, display: "flex", alignItems: "center", gap: 8 }}>
                <Lightbulb size={20} color="#f59e0b" /> Join Sandbox Cohort 1 Waitlist
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: "transparent", border: "none", color: th.txt3, cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: th.txt3, fontStyle: "italic", marginBottom: 16 }}>
              Applications opening soon. All fields marked with * are mandatory!
            </div>

            {/* Step & Progress Indicator Bar */}
            <div style={{ marginBottom: 20, background: th.surf2, padding: 14, borderRadius: 14, border: `1px solid ${th.bdr}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { s: 1, label: "1. Idea & Problem" },
                    { s: 2, label: "2. Solution & Aim" },
                    { s: 3, label: "3. Team & Profile" }
                  ].map(st => (
                    <button
                      key={st.s}
                      onClick={() => {
                        if (st.s < step) {
                          setStep(st.s);
                        }
                      }}
                      style={{
                        padding: "4px 10px", borderRadius: 20, border: "none",
                        background: step === st.s ? "linear-gradient(135deg,#3b82f6,#8b5cf6)" : step > st.s ? "#10b98118" : "transparent",
                        color: step === st.s ? "#fff" : step > st.s ? "#10b981" : th.txt3,
                        fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4
                      }}
                    >
                      {step > st.s && <CheckCircle size={12} />}
                      {st.label}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#3b82f6" }}>
                  Completion: {progressPercent}%
                </div>
              </div>

              {/* Animated Progress Bar */}
              <div style={{ height: 6, background: dk ? "rgba(255,255,255,0.1)" : "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${progressPercent}%`,
                  background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #10b981)",
                  borderRadius: 99, transition: "width 0.4s ease"
                }} />
              </div>
            </div>

            {/* STEP 1: Idea & Problem */}
            {step === 1 && (
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: th.txt2, marginBottom: 4, display: "block" }}>Startup Title *</label>
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. SkillSwap, MindBridge, PayPulse"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: th.txt2, marginBottom: 4, display: "block" }}>What problem are you solving? *</label>
                  <textarea
                    value={form.problem}
                    onChange={e => setForm(f => ({ ...f, problem: e.target.value }))}
                    placeholder="Describe the core problem worth solving..."
                    rows={2}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: th.txt2, marginBottom: 4, display: "block" }}>Who experiences this problem? *</label>
                    <input
                      value={form.who_experiences}
                      onChange={e => setForm(f => ({ ...f, who_experiences: e.target.value }))}
                      placeholder="Target demographic / users"
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: th.txt2, marginBottom: 4, display: "block" }}>Why does it matter? *</label>
                    <input
                      value={form.why_matters}
                      onChange={e => setForm(f => ({ ...f, why_matters: e.target.value }))}
                      placeholder="Severity / market urgency"
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                  <button
                    onClick={nextStep}
                    style={{
                      padding: "9px 22px", borderRadius: 10, border: "none",
                      background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "#fff",
                      fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6
                    }}
                  >
                    Next: Solution & Aim <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Solution & Aim */}
            {step === 2 && (
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: th.txt2, marginBottom: 4, display: "block" }}>How will you solve it? (Proposed Solution) *</label>
                  <input
                    value={form.solution}
                    onChange={e => setForm(f => ({ ...f, solution: e.target.value }))}
                    placeholder="Proposed product / technology solution overview"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>

                {/* MANDATORY QUESTION: Main Aim / Goal for applying */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: "#3b82f6", marginBottom: 6, display: "block" }}>
                    What is your main aim / goal for applying to this cohort? *
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {AIM_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, aim_goal: opt.value }))}
                        style={{
                          padding: "6px 12px", borderRadius: 20,
                          border: `1px solid ${form.aim_goal === opt.value ? "#3b82f6" : th.bdr}`,
                          background: form.aim_goal === opt.value ? "#3b82f618" : th.surf2,
                          color: form.aim_goal === opt.value ? "#3b82f6" : th.txt,
                          fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.2s"
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <input
                    value={form.aim_goal}
                    onChange={e => setForm(f => ({ ...f, aim_goal: e.target.value }))}
                    placeholder="Or type custom goal / aim..."
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: th.txt2, marginBottom: 4, display: "block" }}>Why are you the right person to build it? *</label>
                  <input
                    value={form.why_me}
                    onChange={e => setForm(f => ({ ...f, why_me: e.target.value }))}
                    placeholder="Your background / domain expertise"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
                  <button
                    onClick={prevStep}
                    style={{
                      padding: "8px 18px", borderRadius: 10, border: `1px solid ${th.bdr}`,
                      background: "transparent", color: th.txt2, fontSize: 13, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 6
                    }}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    onClick={nextStep}
                    style={{
                      padding: "9px 22px", borderRadius: 10, border: "none",
                      background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "#fff",
                      fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6
                    }}
                  >
                    Next: Team & Links <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Team & Profile Details */}
            {step === 3 && (
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: th.txt2, marginBottom: 4, display: "block" }}>Team Size *</label>
                  <select
                    value={form.team_size}
                    onChange={e => setForm(f => ({ ...f, team_size: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                  >
                    <option value="Solo Founder">Solo Founder</option>
                    <option value="2-3 Co-founders">2-3 Co-founders</option>
                    <option value="4+ Team Members">4+ Team Members</option>
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: th.txt2, marginBottom: 4, display: "block" }}>LinkedIn Profile URL *</label>
                    <input
                      value={form.linkedin_url}
                      onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))}
                      placeholder="https://linkedin.com/in/yourprofile"
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: th.txt2, marginBottom: 4, display: "block" }}>Demo / Deck Link *</label>
                    <input
                      value={form.demo_url}
                      onChange={e => setForm(f => ({ ...f, demo_url: e.target.value }))}
                      placeholder="https://..."
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
                  <button
                    onClick={prevStep}
                    style={{
                      padding: "8px 18px", borderRadius: 10, border: `1px solid ${th.bdr}`,
                      background: "transparent", color: th.txt2, fontSize: 13, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 6
                    }}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    onClick={submit}
                    disabled={submitting || !form.title.trim()}
                    style={{
                      padding: "9px 28px", borderRadius: 10, border: "none",
                      background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff",
                      fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                      boxShadow: "0 6px 20px rgba(16,185,129,0.3)"
                    }}
                  >
                    {submitting ? "Joining Waitlist…" : "Join Waitlist"}
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>


      {/* ================= COHORT SUBMISSIONS LIST ================= */}
      <div style={{ borderTop: `1px dashed ${th.bdr}`, paddingTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, color: th.txt, margin: 0 }}>
            Cohort Startups ({filtered.length})
          </h3>

          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {[
              ["all", "All"],
              ["week1", "Week 1"],
              ["week2", "Week 2"],
              ["finalist_10", "Top 10"],
              ["winner", "Winners"]
            ].map(([id, label]) => (
              <button key={id} onClick={() => setFilter(id)} style={{ padding: "5px 12px", borderRadius: 16, border: `1px solid ${filter === id ? "#3b82f6" : th.bdr}`, background: filter === id ? "#3b82f618" : "transparent", color: filter === id ? "#3b82f6" : th.txt2, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{label}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <Spin dk={dk} msg="Loading cohort applications…" />
        ) : filtered.length === 0 ? (
          <Card dk={dk} style={{ textAlign: "center", padding: 36, color: th.txt3 }}>
            <Lightbulb size={30} style={{ opacity: 0.4, margin: "0 auto 8px" }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.txt }}>No startups in this category yet</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: th.txt3 }}>Click 'Join Waitlist' above to submit your startup idea!</p>
          </Card>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map(entry => {
              const statusColor = STATUS_COLORS[entry.status] || "#94a3b8";
              const isWinner = entry.status === "winner";
              const isFinalist = entry.status === "finalist_10";

              return (
                <Card dk={dk} key={entry.id} style={{ padding: 16, border: isWinner ? `1.5px solid #10b98140` : isFinalist ? `1.5px solid #f9731640` : undefined }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        {isWinner && <Trophy size={16} color="#10b981" />}
                        {isFinalist && <Star size={14} color="#f97316" />}
                        <span style={{ fontSize: 15, fontWeight: 800, color: th.txt }}>{entry.title}</span>
                        {entry.uid === me && <span style={{ fontSize: 10, background: "#3b82f618", color: "#3b82f6", padding: "2px 7px", borderRadius: 99, fontWeight: 700 }}>Your idea</span>}
                      </div>
                      <div style={{ display: "flex", gap: 12, fontSize: 11, color: th.txt3, flexWrap: "wrap" }}>
                        {entry.audience && <span>Audience: {entry.audience}</span>}
                        {entry.aim_goal && <span>Goal: {entry.aim_goal}</span>}
                        {entry.linkedin_url && (
                          <a href={entry.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", display: "inline-flex", alignItems: "center", gap: 3, textDecoration: "none" }}>
                            <Linkedin size={12} /> LinkedIn Profile
                          </a>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 99, background: `${statusColor}18`, color: statusColor, flexShrink: 0 }}>
                      {ST_LABEL[entry.status] || entry.status}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                    <div style={{ background: th.surf2, borderRadius: 10, padding: "10px 12px", border: `1px solid ${th.bdr}` }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: th.txt3, marginBottom: 3 }}>PROBLEM</div>
                      <div style={{ fontSize: 12, color: th.txt, lineHeight: 1.45 }}>{entry.problem}</div>
                    </div>
                    <div style={{ background: th.surf2, borderRadius: 10, padding: "10px 12px", border: `1px solid ${th.bdr}` }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: th.txt3, marginBottom: 3 }}>SOLUTION</div>
                      <div style={{ fontSize: 12, color: th.txt, lineHeight: 1.45 }}>{entry.solution || "—"}</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
