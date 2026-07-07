import { useEffect, useState, useCallback, useRef } from "react";
import {
  Search, Filter, X, ExternalLink, Bookmark, CheckCircle,
  GraduationCap, Globe, DollarSign, Calendar, Award, Star,
  BookOpen, ChevronDown, SlidersHorizontal, Clock, TrendingUp,
  Loader2, BookmarkCheck, BadgeCheck, AlertCircle
} from "lucide-react";
import { T } from "../config/constants.js";
import { db } from "../services/supabase.js";
import Card from "../components/ui/Card.jsx";
import GlobalCSS from "../components/ui/GlobalCSS.jsx";

// ─── Helpers ────────────────────────────────────────────────────────
const fmtDate = iso => {
  if (!iso) return "No deadline";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const deadlineSoon = iso => {
  if (!iso) return false;
  const diff = new Date(iso) - Date.now();
  return diff > 0 && diff < 30 * 86400000;
};
const deadlinePast = iso => iso && new Date(iso) < Date.now();

const FUNDING_COLORS = {
  "Fully Funded": "#10b981",
  "Partial": "#f59e0b",
  "Tuition Only": "#3b82f6",
  "Living Allowance": "#8b5cf6",
  "Other": "#6b7280",
};
const DEGREE_OPTS = ["All", "Undergraduate", "Masters", "PhD", "Diploma", "Certificate", "Any"];
const CATEGORY_OPTS = ["All", "STEM", "Arts & Humanities", "Business", "Law", "Medicine", "Social Sciences", "Engineering", "Education", "Other"];
const FUNDING_OPTS = ["All", "Fully Funded", "Partial", "Tuition Only", "Living Allowance", "Other"];
const MODE_OPTS = ["All", "On-Campus", "Online", "Hybrid"];
const SORT_OPTS = [
  { id: "latest", label: "Latest", icon: Clock },
  { id: "deadline", label: "Deadline Soon", icon: Calendar },
  { id: "funded", label: "Fully Funded", icon: DollarSign },
  { id: "popular", label: "Most Popular", icon: TrendingUp },
];

// Seed scholarships shown when database is empty / loading
const SEED_SCHOLARSHIPS = [
  {
    id: "seed-1",
    title: "Chevening Scholarships",
    organization: "UK Government / FCO",
    logo_url: "",
    country: "United Kingdom",
    degree: "Masters",
    category: "Any",
    funding_type: "Fully Funded",
    study_mode: "On-Campus",
    deadline: new Date(Date.now() + 60 * 86400000).toISOString(),
    description: "Chevening is the UK government's international awards programme, offering full scholarships for outstanding individuals with leadership potential to study at UK universities.",
    website_url: "https://www.chevening.org",
    is_featured: true,
    status: "published",
    clicks: 4200,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "seed-2",
    title: "Gates Cambridge Scholarship",
    organization: "Gates Foundation / Cambridge University",
    logo_url: "",
    country: "United Kingdom",
    degree: "PhD",
    category: "STEM",
    funding_type: "Fully Funded",
    study_mode: "On-Campus",
    deadline: new Date(Date.now() + 45 * 86400000).toISOString(),
    description: "Prestigious scholarship for outstanding applicants from outside the UK to pursue a full-time postgraduate degree at the University of Cambridge.",
    website_url: "https://www.gatescambridge.org",
    is_featured: true,
    status: "published",
    clicks: 3800,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "seed-3",
    title: "Fulbright Program",
    organization: "U.S. Department of State",
    logo_url: "",
    country: "United States",
    degree: "Masters",
    category: "Any",
    funding_type: "Fully Funded",
    study_mode: "On-Campus",
    deadline: new Date(Date.now() + 90 * 86400000).toISOString(),
    description: "The Fulbright Program is the U.S. government's flagship international educational exchange program, offering grants for graduate study, research, and teaching.",
    website_url: "https://foreign.fulbrightonline.org",
    is_featured: false,
    status: "published",
    clicks: 5100,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: "seed-4",
    title: "DAAD Scholarships",
    organization: "German Academic Exchange Service",
    logo_url: "",
    country: "Germany",
    degree: "Masters",
    category: "Engineering",
    funding_type: "Fully Funded",
    study_mode: "On-Campus",
    deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
    description: "DAAD offers scholarships for international students wishing to pursue postgraduate study and research in Germany across all academic disciplines.",
    website_url: "https://www.daad.de/en/",
    is_featured: true,
    status: "published",
    clicks: 2900,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "seed-5",
    title: "AAUW International Fellowship",
    organization: "American Association of University Women",
    logo_url: "",
    country: "United States",
    degree: "PhD",
    category: "Arts & Humanities",
    funding_type: "Partial",
    study_mode: "On-Campus",
    deadline: new Date(Date.now() + 75 * 86400000).toISOString(),
    description: "International Fellowships are awarded to women who are not U.S. citizens or permanent residents for full-time study or research in the United States.",
    website_url: "https://www.aauw.org/resources/programs/fellowships-grants/current-opportunities/international/",
    is_featured: false,
    status: "published",
    clicks: 1600,
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  {
    id: "seed-6",
    title: "Aga Khan Foundation Scholarship",
    organization: "Aga Khan Foundation",
    logo_url: "",
    country: "Multiple Countries",
    degree: "Masters",
    category: "Social Sciences",
    funding_type: "Fully Funded",
    study_mode: "On-Campus",
    deadline: new Date(Date.now() + 120 * 86400000).toISOString(),
    description: "AKF awards a limited number of scholarships each year to outstanding students from developing countries who have no other means of financing their studies.",
    website_url: "https://www.akdn.org/our-agencies/aga-khan-foundation/international-scholarship-programme",
    is_featured: false,
    status: "published",
    clicks: 2100,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
];

// ─── Scholarship Card ───────────────────────────────────────────────
function ScholarshipCard({ s, dk, isDraft, isApplied, onApply, onDraft, onMarkApplied, isMobile }) {
  const th = T(dk);
  const [hovered, setHovered] = useState(false);
  const fundingColor = FUNDING_COLORS[s.funding_type] || "#6b7280";
  const soon = deadlineSoon(s.deadline);
  const past = deadlinePast(s.deadline);

  return (
    <div
      onClick={() => onApply(s)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? (dk ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.92)")
          : (dk ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.75)"),
        border: `1px solid ${hovered ? (dk ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.25)") : (dk ? "rgba(255,255,255,0.08)" : "rgba(99,102,241,0.12)")}`,
        borderRadius: 20,
        padding: isMobile ? "16px" : "20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        cursor: "pointer",
        transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
        transform: hovered ? "translateY(-3px)" : "none",
        boxShadow: hovered
          ? (dk ? "0 16px 40px rgba(0,0,0,0.5)" : "0 16px 40px rgba(99,102,241,0.12)")
          : (dk ? "0 4px 16px rgba(0,0,0,0.25)" : "0 4px 16px rgba(0,0,0,0.06)"),
        position: "relative",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Featured badge */}
      {s.is_featured && (
        <div style={{
          position: "absolute", top: 14, right: 14,
          background: "linear-gradient(135deg,#f59e0b,#d97706)",
          color: "#fff", fontSize: 9, fontWeight: 800,
          padding: "3px 8px", borderRadius: 99,
          display: "flex", alignItems: "center", gap: 3,
          textTransform: "uppercase", letterSpacing: "0.5px",
          boxShadow: "0 4px 12px rgba(245,158,11,0.4)",
        }}>
          <Star size={8} fill="#fff" />Featured
        </div>
      )}

      {/* Header row */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingRight: s.is_featured ? 64 : 0 }}>
        {/* Logo */}
        <div style={{
          width: 46, height: 46, borderRadius: 12, flexShrink: 0,
          background: s.logo_url ? "transparent" : `linear-gradient(135deg,#6366f1,#8b5cf6)`,
          border: `1px solid ${dk ? "rgba(255,255,255,0.1)" : "rgba(99,102,241,0.15)"}`,
          display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
        }}>
          {s.logo_url
            ? <img src={s.logo_url} alt={s.organization} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            : <GraduationCap size={22} color="#fff" />
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: th.txt, lineHeight: 1.3, marginBottom: 2 }}>{s.title}</div>
          <div style={{ fontSize: 12, color: th.txt3, fontWeight: 600 }}>{s.organization}</div>
        </div>
      </div>

      {/* Tags row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <span style={{ background: `${fundingColor}18`, color: fundingColor, fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99, border: `1px solid ${fundingColor}30` }}>
          {s.funding_type}
        </span>
        <span style={{ background: dk ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.08)", color: "#3b82f6", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99, border: "1px solid rgba(59,130,246,0.2)" }}>
          {s.degree}
        </span>
        <span style={{ background: dk ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: th.txt2, fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99, display: "flex", alignItems: "center", gap: 4 }}>
          <Globe size={9} />{s.country}
        </span>
        {s.study_mode && (
          <span style={{ background: dk ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.08)", color: "#10b981", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99, border: "1px solid rgba(16,185,129,0.2)" }}>
            {s.study_mode}
          </span>
        )}
      </div>

      {/* Description */}
      <p style={{ fontSize: 12, color: th.txt2, lineHeight: 1.6, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {s.description}
      </p>

      {/* Deadline row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Calendar size={12} color={past ? "#ef4444" : soon ? "#f59e0b" : th.txt3} />
        <span style={{ fontSize: 11, fontWeight: 700, color: past ? "#ef4444" : soon ? "#f59e0b" : th.txt3 }}>
          {past ? "Deadline passed" : `Deadline: ${fmtDate(s.deadline)}`}
        </span>
        {soon && !past && (
          <span style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 99, border: "1px solid rgba(245,158,11,0.3)" }}>
            Soon!
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ display: "flex", gap: 8, marginTop: 2 }}
      >
        {/* Apply Now */}
        <button
          onClick={() => onApply(s)}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            color: "#fff", border: "none", borderRadius: 12,
            padding: "9px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
            transition: "all 0.18s ease",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          <ExternalLink size={12} />Apply Now
        </button>

        {/* Draft toggle */}
        <button
          onClick={() => onDraft(s)}
          title={isDraft ? "Remove bookmark" : "Save to Draft"}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 38, height: 38, border: `1px solid ${isDraft ? "rgba(99,102,241,0.5)" : (dk ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)")}`,
            borderRadius: 12, background: isDraft ? "rgba(99,102,241,0.12)" : "transparent",
            color: isDraft ? "#6366f1" : th.txt3, cursor: "pointer",
            transition: "all 0.18s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.1)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = isDraft ? "rgba(99,102,241,0.12)" : "transparent"; e.currentTarget.style.borderColor = isDraft ? "rgba(99,102,241,0.5)" : (dk ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"); }}
        >
          {isDraft ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
        </button>

        {/* Mark as Applied */}
        <button
          onClick={() => onMarkApplied(s)}
          title={isApplied ? "Marked as applied" : "Mark as Applied"}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 38, height: 38, border: `1px solid ${isApplied ? "rgba(16,185,129,0.5)" : (dk ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)")}`,
            borderRadius: 12, background: isApplied ? "rgba(16,185,129,0.12)" : "transparent",
            color: isApplied ? "#10b981" : th.txt3, cursor: "pointer",
            transition: "all 0.18s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(16,185,129,0.1)"; e.currentTarget.style.borderColor = "rgba(16,185,129,0.4)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = isApplied ? "rgba(16,185,129,0.12)" : "transparent"; e.currentTarget.style.borderColor = isApplied ? "rgba(16,185,129,0.5)" : (dk ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"); }}
        >
          {isApplied ? <BadgeCheck size={15} /> : <CheckCircle size={15} />}
        </button>
      </div>
    </div>
  );
}

// ─── Main View ──────────────────────────────────────────────────────
export default function ScholarshipsView({ me, dk, profiles, addNotif, isMobile, myProfile }) {
  const th = T(dk);
  const profile = myProfile || profiles?.[me] || {};

  // Data
  const [scholarships, setScholarships] = useState([]);
  const [drafts, setDrafts] = useState([]); // [{scholarship_id, saved_at}]
  const [applied, setApplied] = useState([]); // [{scholarship_id, applied_at}]
  const [loading, setLoading] = useState(true);

  // UI State
  const [tab, setTab] = useState("all"); // all | draft | applied
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("latest");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  // Filters
  const [fCountry, setFCountry] = useState("All");
  const [fDegree, setFDegree] = useState("All");
  const [fCategory, setFCategory] = useState("All");
  const [fFunding, setFFunding] = useState("All");
  const [fMode, setFMode] = useState("All");
  const [fDeadline, setFDeadline] = useState("all"); // all | upcoming | past

  // Load data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [sData, dData, aData] = await Promise.all([
          db.get("rs_scholarships", "status=eq.published&order=created_at.desc"),
          me ? db.get("rs_scholarship_drafts", `uid=eq.${me}`) : Promise.resolve([]),
          me ? db.get("rs_scholarship_applied", `uid=eq.${me}`) : Promise.resolve([]),
        ]);
        if (!cancelled) {
          setScholarships(sData?.length ? sData : SEED_SCHOLARSHIPS);
          setDrafts(Array.isArray(dData) ? dData : []);
          setApplied(Array.isArray(aData) ? aData : []);
        }
      } catch {
        if (!cancelled) setScholarships(SEED_SCHOLARSHIPS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [me]);

  // Personalization sort bonus
  const personalizeScore = useCallback((s) => {
    let score = 0;
    if (profile.country && s.country?.toLowerCase().includes(profile.country.toLowerCase())) score += 3;
    if (profile.study_country && s.country?.toLowerCase().includes(profile.study_country.toLowerCase())) score += 2;
    if (profile.degree && s.degree?.toLowerCase().includes(profile.degree.toLowerCase())) score += 2;
    if (profile.interests?.some(i => s.category?.toLowerCase().includes(i))) score += 1;
    return score;
  }, [profile]);

  // Unique countries from scholarships
  const countries = ["All", ...Array.from(new Set(scholarships.map(s => s.country).filter(Boolean)))];

  // Apply filters + search + sort
  const filtered = useCallback(() => {
    let list = [...scholarships];

    // Tab filter
    const draftIds = new Set(drafts.map(d => String(d.scholarship_id)));
    const appliedIds = new Set(applied.map(a => String(a.scholarship_id)));

    if (tab === "draft") list = list.filter(s => draftIds.has(String(s.id)));
    else if (tab === "applied") list = list.filter(s => appliedIds.has(String(s.id)));

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.title?.toLowerCase().includes(q) ||
        s.organization?.toLowerCase().includes(q) ||
        s.country?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q)
      );
    }

    // Filters
    if (fCountry !== "All") list = list.filter(s => s.country === fCountry);
    if (fDegree !== "All") list = list.filter(s => s.degree === fDegree);
    if (fCategory !== "All") list = list.filter(s => s.category === fCategory);
    if (fFunding !== "All") list = list.filter(s => s.funding_type === fFunding);
    if (fMode !== "All") list = list.filter(s => s.study_mode === fMode);
    if (fDeadline === "upcoming") list = list.filter(s => !deadlinePast(s.deadline));
    else if (fDeadline === "past") list = list.filter(s => deadlinePast(s.deadline));

    // Sort
    if (sort === "latest") {
      list.sort((a, b) => {
        const pa = personalizeScore(b) - personalizeScore(a);
        if (pa !== 0) return pa;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    } else if (sort === "deadline") {
      list.sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      });
    } else if (sort === "funded") {
      list.sort((a, b) => {
        const fa = a.funding_type === "Fully Funded" ? 0 : 1;
        const fb = b.funding_type === "Fully Funded" ? 0 : 1;
        return fa - fb;
      });
    } else if (sort === "popular") {
      list.sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
    }

    return list;
  }, [scholarships, drafts, applied, tab, search, fCountry, fDegree, fCategory, fFunding, fMode, fDeadline, sort, personalizeScore]);

  const allFiltered = filtered();
  const total = allFiltered.length;
  const paginated = allFiltered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < total;

  // Draft toggle
  const handleDraft = async (s) => {
    const sid = String(s.id);
    const existing = drafts.find(d => String(d.scholarship_id) === sid);
    if (existing) {
      // Remove
      setDrafts(prev => prev.filter(d => String(d.scholarship_id) !== sid));
      try { await db.del("rs_scholarship_drafts", `uid=eq.${me}&scholarship_id=eq.${sid}`); } catch { }
      addNotif({ type: "info", msg: "Removed from drafts" });
    } else {
      // Add
      const rec = { uid: me, scholarship_id: sid, saved_at: new Date().toISOString() };
      setDrafts(prev => [...prev, rec]);
      try { await db.post("rs_scholarship_drafts", rec); } catch { }
      addNotif({ type: "success", msg: `📌 Saved "${s.title}" to drafts` });
    }
  };

  // Mark applied
  const handleMarkApplied = async (s) => {
    const sid = String(s.id);
    const existing = applied.find(a => String(a.scholarship_id) === sid);
    if (existing) {
      setApplied(prev => prev.filter(a => String(a.scholarship_id) !== sid));
      try { await db.del("rs_scholarship_applied", `uid=eq.${me}&scholarship_id=eq.${sid}`); } catch { }
      addNotif({ type: "info", msg: "Unmarked as applied" });
    } else {
      const rec = { uid: me, scholarship_id: sid, applied_at: new Date().toISOString() };
      setApplied(prev => [...prev, rec]);
      try { await db.post("rs_scholarship_applied", rec); } catch { }
      addNotif({ type: "success", msg: `✅ Marked "${s.title}" as applied!` });
    }
  };

  // Apply now (open external + track click)
  const handleApply = async (s) => {
    if (s.website_url && s.website_url !== "#") {
      window.open(s.website_url, "_blank", "noopener,noreferrer");
      try { await db.post("rs_scholarship_clicks", { uid: me, scholarship_id: s.id, clicked_at: new Date().toISOString() }); } catch { }
    }
  };

  const draftIds = new Set(drafts.map(d => String(d.scholarship_id)));
  const appliedIds = new Set(applied.map(a => String(a.scholarship_id)));

  const activeFilters = [fCountry, fDegree, fCategory, fFunding, fMode].filter(v => v !== "All").length
    + (fDeadline !== "all" ? 1 : 0);

  const clearFilters = () => {
    setFCountry("All"); setFDegree("All"); setFCategory("All");
    setFFunding("All"); setFMode("All"); setFDeadline("all");
  };

  const TABS = [
    { id: "all", label: "All Scholarships", count: scholarships.length },
    { id: "draft", label: "Draft", count: drafts.length },
    { id: "applied", label: "Applied", count: applied.length },
  ];

  return (
    <>
      <GlobalCSS dk={dk} />
      <div style={{ padding: isMobile ? "12px 8px 80px" : "24px 20px 32px", maxWidth: 1140, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 24px rgba(99,102,241,0.35)",
            }}>
              <GraduationCap size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 900, color: th.txt, margin: 0, letterSpacing: "-0.5px" }}>
                Scholarships
              </h1>
              <p style={{ fontSize: 13, color: th.txt2, margin: 0 }}>
                Discover verified scholarships from universities, governments, NGOs and organizations around the world.
              </p>
            </div>
          </div>

          {/* Personalization banner */}
          {profile.country || profile.who === "student" ? (
            <div style={{
              background: dk ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.06)",
              border: "1px solid rgba(99,102,241,0.2)", borderRadius: 14,
              padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, marginTop: 14,
            }}>
              <Star size={14} color="#6366f1" />
              <span style={{ fontSize: 12, color: th.txt2, fontWeight: 500 }}>
                Scholarships are personalized based on your profile.{" "}
                {profile.country && <span style={{ color: "#6366f1", fontWeight: 700 }}>Country: {profile.country}. </span>}
                {profile.degree && <span style={{ color: "#8b5cf6", fontWeight: 700 }}>Degree: {profile.degree}.</span>}
              </span>
            </div>
          ) : null}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setPage(1); }}
              style={{
                padding: "8px 16px", borderRadius: 12, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
                background: tab === t.id
                  ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                  : (dk ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"),
                color: tab === t.id ? "#fff" : th.txt2,
                transition: "all 0.18s ease",
                display: "flex", alignItems: "center", gap: 6,
                boxShadow: tab === t.id ? "0 4px 14px rgba(99,102,241,0.35)" : "none",
              }}
            >
              {t.label}
              <span style={{
                background: tab === t.id ? "rgba(255,255,255,0.25)" : (dk ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"),
                color: tab === t.id ? "#fff" : th.txt3,
                fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 99,
              }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Search + Filter bar ── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{
            flex: 1, minWidth: isMobile ? "100%" : 240,
            display: "flex", alignItems: "center", gap: 10,
            background: dk ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)",
            border: `1px solid ${th.bdr}`, borderRadius: 14, padding: "0 14px",
            backdropFilter: "blur(12px)",
          }}>
            <Search size={15} color={th.txt3} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search scholarships, universities, countries..."
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                fontSize: 13, color: th.txt, padding: "11px 0",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3, padding: 2, display: "flex" }}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(v => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "0 16px", height: 44,
              borderRadius: 14, border: `1px solid ${activeFilters > 0 ? "rgba(99,102,241,0.5)" : th.bdr}`,
              background: activeFilters > 0 ? "rgba(99,102,241,0.1)" : (dk ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)"),
              color: activeFilters > 0 ? "#6366f1" : th.txt2, cursor: "pointer", fontSize: 13, fontWeight: 600,
              backdropFilter: "blur(12px)",
            }}
          >
            <SlidersHorizontal size={15} />
            Filters
            {activeFilters > 0 && (
              <span style={{ background: "#6366f1", color: "#fff", fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 99 }}>
                {activeFilters}
              </span>
            )}
          </button>

          {/* Sort */}
          <div style={{ position: "relative" }}>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              style={{
                appearance: "none", padding: "0 36px 0 14px", height: 44,
                borderRadius: 14, border: `1px solid ${th.bdr}`,
                background: dk ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)",
                color: th.txt, fontSize: 13, fontWeight: 600, cursor: "pointer", outline: "none",
                backdropFilter: "blur(12px)",
              }}
            >
              {SORT_OPTS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <ChevronDown size={13} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: th.txt3, pointerEvents: "none" }} />
          </div>
        </div>

        {/* ── Filter Panel ── */}
        {showFilters && (
          <div style={{
            background: dk ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.85)",
            border: `1px solid ${th.bdr}`, borderRadius: 16,
            padding: "16px 20px", marginBottom: 16,
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14,
            backdropFilter: "blur(14px)",
            animation: "rs-fade-in 0.2s ease",
          }}>
            {[
              { label: "Country", value: fCountry, set: setFCountry, opts: countries },
              { label: "Degree", value: fDegree, set: setFDegree, opts: DEGREE_OPTS },
              { label: "Category", value: fCategory, set: setFCategory, opts: CATEGORY_OPTS },
              { label: "Funding Type", value: fFunding, set: setFFunding, opts: FUNDING_OPTS },
              { label: "Study Mode", value: fMode, set: setFMode, opts: MODE_OPTS },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: 10, fontWeight: 700, color: th.txt3, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{f.label}</div>
                <div style={{ position: "relative" }}>
                  <select
                    value={f.value}
                    onChange={e => { f.set(e.target.value); setPage(1); }}
                    style={{
                      width: "100%", appearance: "none", padding: "8px 28px 8px 10px",
                      borderRadius: 10, border: `1px solid ${th.bdr}`,
                      background: dk ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)",
                      color: th.txt, fontSize: 12, fontWeight: 600, cursor: "pointer", outline: "none",
                    }}
                  >
                    {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <ChevronDown size={11} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: th.txt3, pointerEvents: "none" }} />
                </div>
              </div>
            ))}

            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: th.txt3, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Deadline</div>
              <div style={{ position: "relative" }}>
                <select
                  value={fDeadline}
                  onChange={e => { setFDeadline(e.target.value); setPage(1); }}
                  style={{
                    width: "100%", appearance: "none", padding: "8px 28px 8px 10px",
                    borderRadius: 10, border: `1px solid ${th.bdr}`,
                    background: dk ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)",
                    color: th.txt, fontSize: 12, fontWeight: 600, cursor: "pointer", outline: "none",
                  }}
                >
                  <option value="all">All</option>
                  <option value="upcoming">Upcoming only</option>
                  <option value="past">Expired</option>
                </select>
                <ChevronDown size={11} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: th.txt3, pointerEvents: "none" }} />
              </div>
            </div>

            {activeFilters > 0 && (
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button
                  onClick={clearFilters}
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                    background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  }}
                >
                  <X size={11} />Clear Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Results count ── */}
        {!loading && (
          <div style={{ fontSize: 12, color: th.txt3, fontWeight: 600, marginBottom: 16 }}>
            {total === 0 ? "No scholarships found" : `Showing ${paginated.length} of ${total} scholarship${total !== 1 ? "s" : ""}`}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 240, gap: 14 }}>
            <Loader2 size={32} color="#6366f1" style={{ animation: "spin 1s linear infinite" }} />
            <p style={{ color: th.txt2, fontSize: 14, fontWeight: 600 }}>Loading scholarships…</p>
          </div>
        )}

        {/* ── Empty states ── */}
        {!loading && total === 0 && tab === "draft" && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: th.txt2 }}>
            <Bookmark size={42} color={th.txt3} style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: th.txt, marginBottom: 6 }}>No saved scholarships</div>
            <p style={{ fontSize: 13, color: th.txt2 }}>Click the bookmark icon on any scholarship to save it for later.</p>
          </div>
        )}
        {!loading && total === 0 && tab === "applied" && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: th.txt2 }}>
            <CheckCircle size={42} color={th.txt3} style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: th.txt, marginBottom: 6 }}>No applications tracked yet</div>
            <p style={{ fontSize: 13, color: th.txt2 }}>After applying externally, return here and click "Mark as Applied" to track your progress.</p>
          </div>
        )}
        {!loading && total === 0 && tab === "all" && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: th.txt2 }}>
            <AlertCircle size={42} color={th.txt3} style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: th.txt, marginBottom: 6 }}>No scholarships found</div>
            <p style={{ fontSize: 13, color: th.txt2 }}>Try adjusting your search or filters.</p>
            {activeFilters > 0 && (
              <button onClick={clearFilters} style={{ marginTop: 12, padding: "9px 20px", borderRadius: 12, background: "#6366f1", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* ── Cards Grid ── */}
        {!loading && paginated.length > 0 && (
          <>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))",
              gap: isMobile ? 12 : 18,
            }}>
              {paginated.map(s => (
                <ScholarshipCard
                  key={s.id}
                  s={s}
                  dk={dk}
                  isDraft={draftIds.has(String(s.id))}
                  isApplied={appliedIds.has(String(s.id))}
                  onApply={handleApply}
                  onDraft={handleDraft}
                  onMarkApplied={handleMarkApplied}
                  isMobile={isMobile}
                />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div style={{ textAlign: "center", marginTop: 28 }}>
                <button
                  onClick={() => setPage(p => p + 1)}
                  style={{
                    padding: "11px 32px", borderRadius: 14, fontSize: 14, fontWeight: 700,
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color: "#fff", border: "none", cursor: "pointer",
                    boxShadow: "0 4px 18px rgba(99,102,241,0.4)",
                    transition: "all 0.18s ease",
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                >
                  Load More ({total - paginated.length} remaining)
                </button>
              </div>
            )}
          </>
        )}

        {/* Inline CSS for animations */}
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes rs-fade-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
      </div>
    </>
  );
}
