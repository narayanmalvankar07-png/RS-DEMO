import { useState, useEffect, useCallback } from "react";
import {
  Plus, Edit2, Trash2, Eye, EyeOff, Star, Archive,
  Search, Filter, ChevronDown, X, Save, Upload,
  GraduationCap, Globe, DollarSign, Calendar, Award,
  BookOpen, Link, ExternalLink, BarChart2, Users, MousePointerClick,
  CheckCircle, Loader2, AlertCircle, RefreshCw
} from "lucide-react";
import { T } from "../config/constants.js";
import { db } from "../services/supabase.js";
import Card from "../components/ui/Card.jsx";

// ─── Constants ──────────────────────────────────────────────────────
const DEGREE_OPTS = ["Undergraduate", "Masters", "PhD", "Diploma", "Certificate", "Any"];
const CATEGORY_OPTS = ["STEM", "Arts & Humanities", "Business", "Law", "Medicine", "Social Sciences", "Engineering", "Education", "Other"];
const FUNDING_OPTS = ["Fully Funded", "Partial", "Tuition Only", "Living Allowance", "Other"];
const MODE_OPTS = ["On-Campus", "Online", "Hybrid"];
const STATUS_OPTS = ["draft", "published", "expired"];

const EMPTY_FORM = {
  title: "", organization: "", logo_url: "", banner_url: "",
  country: "", degree: "Masters", category: "STEM",
  funding_type: "Fully Funded", study_mode: "On-Campus",
  deadline: "", description: "", website_url: "",
  is_featured: false, status: "draft",
};

// ─── Stat card ──────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, dk }) {
  const th = T(dk);
  return (
    <Card dk={dk} style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} color={color} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: th.txt3, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color: th.txt }}>{value}</div>
    </Card>
  );
}

// ─── Form Modal ─────────────────────────────────────────────────────
function ScholarshipForm({ dk, initial, onSave, onClose, saving }) {
  const th = T(dk);
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inputStyle = {
    width: "100%", background: dk ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.9)",
    border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "9px 13px",
    fontSize: 13, color: th.txt, outline: "none", boxSizing: "border-box",
  };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: th.txt3, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, display: "block" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
      <div style={{
        width: "100%", maxWidth: 700, maxHeight: "90vh", overflowY: "auto",
        background: dk ? "rgba(5,8,22,0.98)" : "rgba(255,255,255,0.98)",
        border: `1px solid ${th.bdr}`, borderRadius: 24, padding: "28px",
        backdropFilter: "blur(20px)", boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: th.txt }}>{initial?.id ? "Edit Scholarship" : "Add Scholarship"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3, display: "flex" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={labelStyle}>Scholarship Title *</label>
            <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Chevening Scholarships" style={inputStyle} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={labelStyle}>Organization / University *</label>
            <input value={form.organization} onChange={e => set("organization", e.target.value)} placeholder="e.g. UK Government / FCO" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Organization Logo URL</label>
            <input value={form.logo_url} onChange={e => set("logo_url", e.target.value)} placeholder="https://..." style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Banner Image URL (optional)</label>
            <input value={form.banner_url} onChange={e => set("banner_url", e.target.value)} placeholder="https://..." style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Country *</label>
            <input value={form.country} onChange={e => set("country", e.target.value)} placeholder="e.g. United Kingdom" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Degree Level</label>
            <select value={form.degree} onChange={e => set("degree", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {DEGREE_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select value={form.category} onChange={e => set("category", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {CATEGORY_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Funding Type</label>
            <select value={form.funding_type} onChange={e => set("funding_type", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {FUNDING_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Study Mode</label>
            <select value={form.study_mode} onChange={e => set("study_mode", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {MODE_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Deadline</label>
            <input type="date" value={form.deadline ? form.deadline.slice(0, 10) : ""} onChange={e => set("deadline", e.target.value ? new Date(e.target.value).toISOString() : "")} style={inputStyle} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={labelStyle}>Official Scholarship Website URL *</label>
            <input value={form.website_url} onChange={e => set("website_url", e.target.value)} placeholder="https://www.chevening.org" style={inputStyle} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={labelStyle}>Short Description</label>
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              rows={4}
              placeholder="Describe the scholarship, eligibility, and benefits..."
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
            />
          </div>

          {/* Status & Featured */}
          <div>
            <label style={labelStyle}>Status</label>
            <select value={form.status} onChange={e => set("status", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {STATUS_OPTS.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "9px 13px", borderRadius: 10, background: form.is_featured ? "rgba(245,158,11,0.1)" : "transparent", border: `1px solid ${form.is_featured ? "rgba(245,158,11,0.4)" : th.bdr}`, width: "100%", boxSizing: "border-box" }}>
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={e => set("is_featured", e.target.checked)}
                style={{ accentColor: "#f59e0b", width: 16, height: 16 }}
              />
              <span style={{ fontSize: 13, fontWeight: 700, color: form.is_featured ? "#f59e0b" : th.txt2 }}>⭐ Featured Scholarship</span>
            </label>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700, background: "transparent", color: th.txt2, border: `1px solid ${th.bdr}`, cursor: "pointer" }}>
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.title || !form.organization || !form.website_url}
            style={{
              padding: "10px 24px", borderRadius: 12, fontSize: 13, fontWeight: 700,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff",
              border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
              opacity: (saving || !form.title || !form.organization || !form.website_url) ? 0.6 : 1,
              boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
            }}
          >
            {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />}
            {saving ? "Saving…" : (initial?.id ? "Update" : "Create Scholarship")}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Main Admin View ─────────────────────────────────────────────────
export default function AdminScholarshipsView({ dk, addNotif }) {
  const th = T(dk);
  const [scholarships, setScholarships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [clickStats, setClickStats] = useState({ total: 0 });
  const [appliedStats, setAppliedStats] = useState({ total: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, clicks, apps] = await Promise.all([
        db.get("rs_scholarships", "order=created_at.desc"),
        db.get("rs_scholarship_clicks", ""),
        db.get("rs_scholarship_applied", ""),
      ]);
      setScholarships(Array.isArray(data) ? data : []);
      setClickStats({ total: Array.isArray(clicks) ? clicks.length : 0 });
      setAppliedStats({ total: Array.isArray(apps) ? apps.length : 0 });
    } catch {
      setScholarships([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Stats
  const total = scholarships.length;
  const published = scholarships.filter(s => s.status === "published").length;
  const featured = scholarships.filter(s => s.is_featured).length;
  const expired = scholarships.filter(s => s.status === "expired").length;
  const draftCount = scholarships.filter(s => s.status === "draft").length;

  // Filtered list
  const filtered = scholarships.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.title?.toLowerCase().includes(q) || s.organization?.toLowerCase().includes(q) || s.country?.toLowerCase().includes(q);
    const matchStatus = fStatus === "all" || s.status === fStatus;
    return matchSearch && matchStatus;
  });

  // Save (create or update)
  const handleSave = async (form) => {
    if (!form.title || !form.organization || !form.website_url) return;
    setSaving(true);
    try {
      if (editing?.id) {
        await db.patch("rs_scholarships", `id=eq.${editing.id}`, { ...form, updated_at: new Date().toISOString() });
        setScholarships(prev => prev.map(s => s.id === editing.id ? { ...s, ...form } : s));
        addNotif?.({ type: "success", msg: "✅ Scholarship updated!" });
      } else {
        const saved = await db.post("rs_scholarships", { ...form, created_at: new Date().toISOString(), clicks: 0 });
        if (saved) setScholarships(prev => [saved, ...prev]);
        addNotif?.({ type: "success", msg: "✅ Scholarship created!" });
      }
      setShowForm(false);
      setEditing(null);
    } catch {
      addNotif?.({ type: "error", msg: "❌ Failed to save scholarship" });
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async (s) => {
    if (!confirm(`Delete "${s.title}"? This cannot be undone.`)) return;
    try {
      await db.del("rs_scholarships", `id=eq.${s.id}`);
      setScholarships(prev => prev.filter(x => x.id !== s.id));
      addNotif?.({ type: "success", msg: "Scholarship deleted" });
    } catch {
      addNotif?.({ type: "error", msg: "Failed to delete" });
    }
  };

  // Toggle publish
  const handleTogglePublish = async (s) => {
    const newStatus = s.status === "published" ? "draft" : "published";
    try {
      await db.patch("rs_scholarships", `id=eq.${s.id}`, { status: newStatus });
      setScholarships(prev => prev.map(x => x.id === s.id ? { ...x, status: newStatus } : x));
      addNotif?.({ type: "success", msg: newStatus === "published" ? "Published!" : "Unpublished" });
    } catch {
      addNotif?.({ type: "error", msg: "Failed to update status" });
    }
  };

  // Toggle featured
  const handleToggleFeatured = async (s) => {
    const newFeatured = !s.is_featured;
    try {
      await db.patch("rs_scholarships", `id=eq.${s.id}`, { is_featured: newFeatured });
      setScholarships(prev => prev.map(x => x.id === s.id ? { ...x, is_featured: newFeatured } : x));
      addNotif?.({ type: "success", msg: newFeatured ? "⭐ Featured!" : "Removed from featured" });
    } catch {
      addNotif?.({ type: "error", msg: "Failed to update" });
    }
  };

  // Archive
  const handleArchive = async (s) => {
    try {
      await db.patch("rs_scholarships", `id=eq.${s.id}`, { status: "expired" });
      setScholarships(prev => prev.map(x => x.id === s.id ? { ...x, status: "expired" } : x));
      addNotif?.({ type: "info", msg: "Scholarship archived" });
    } catch {
      addNotif?.({ type: "error", msg: "Failed to archive" });
    }
  };

  const statusColor = { published: "#10b981", draft: "#f59e0b", expired: "#6b7280" };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: th.txt }}>Scholarship Management</div>
          <div style={{ fontSize: 12, color: th.txt3, marginTop: 2 }}>Manage scholarship listings visible to students</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={load}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 12, border: `1px solid ${th.bdr}`, background: "transparent", color: th.txt2, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            <RefreshCw size={14} />Refresh
          </button>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,0.4)" }}
          >
            <Plus size={15} />Add Scholarship
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatCard icon={GraduationCap} label="Total" value={total} color="#6366f1" dk={dk} />
        <StatCard icon={Eye} label="Published" value={published} color="#10b981" dk={dk} />
        <StatCard icon={Star} label="Featured" value={featured} color="#f59e0b" dk={dk} />
        <StatCard icon={Archive} label="Expired" value={expired} color="#6b7280" dk={dk} />
        <StatCard icon={BookOpen} label="Draft" value={draftCount} color="#3b82f6" dk={dk} />
        <StatCard icon={MousePointerClick} label="Total Clicks" value={clickStats.total} color="#8b5cf6" dk={dk} />
        <StatCard icon={CheckCircle} label="Applied" value={appliedStats.total} color="#ec4899" dk={dk} />
      </div>

      {/* Search + Filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{
          flex: 1, minWidth: 240, display: "flex", alignItems: "center", gap: 10,
          background: dk ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)",
          border: `1px solid ${th.bdr}`, borderRadius: 12, padding: "0 14px",
        }}>
          <Search size={14} color={th.txt3} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search scholarships..."
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: th.txt, padding: "10px 0" }}
          />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3, display: "flex" }}><X size={12} /></button>}
        </div>
        <select
          value={fStatus}
          onChange={e => setFStatus(e.target.value)}
          style={{
            padding: "0 36px 0 14px", height: 42, borderRadius: 12, border: `1px solid ${th.bdr}`,
            background: dk ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)",
            color: th.txt, fontSize: 13, fontWeight: 600, cursor: "pointer", outline: "none",
          }}
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Scholarship List */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <Loader2 size={28} color="#6366f1" style={{ animation: "spin 1s linear infinite" }} />
        </div>
      ) : filtered.length === 0 ? (
        <Card dk={dk} style={{ padding: 48, textAlign: "center" }}>
          <AlertCircle size={36} color={th.txt3} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: th.txt, marginBottom: 6 }}>No scholarships found</div>
          <p style={{ color: th.txt3, fontSize: 13 }}>Add your first scholarship using the button above.</p>
        </Card>
      ) : (
        <Card dk={dk} style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${th.bdr}` }}>
                  {["Scholarship", "Org / Country", "Degree", "Funding", "Deadline", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: th.txt3, textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${th.bdr}`, transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = dk ? "rgba(255,255,255,0.03)" : "rgba(99,102,241,0.03)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Title + featured */}
                    <td style={{ padding: "12px 14px", minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                          {s.logo_url ? <img src={s.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <GraduationCap size={14} color="#fff" />}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: th.txt }}>{s.title}</div>
                          {s.is_featured && <span style={{ fontSize: 9, fontWeight: 800, color: "#f59e0b", background: "rgba(245,158,11,0.12)", padding: "1px 6px", borderRadius: 99 }}>⭐ Featured</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontSize: 12, color: th.txt2, fontWeight: 600 }}>{s.organization}</div>
                      <div style={{ fontSize: 11, color: th.txt3 }}>{s.country}</div>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: th.txt2, whiteSpace: "nowrap" }}>{s.degree}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: "rgba(16,185,129,0.12)", color: "#10b981" }}>{s.funding_type}</span>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: th.txt3, whiteSpace: "nowrap" }}>
                      {s.deadline ? new Date(s.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: `${statusColor[s.status] || "#6b7280"}18`, color: statusColor[s.status] || "#6b7280" }}>
                        {s.status}
                      </span>
                    </td>
                    {/* Actions */}
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: 5 }}>
                        {/* Edit */}
                        <button onClick={() => { setEditing(s); setShowForm(true); }} title="Edit" style={{ padding: "6px 8px", borderRadius: 8, border: "none", background: "rgba(99,102,241,0.1)", color: "#6366f1", cursor: "pointer", display: "flex" }}>
                          <Edit2 size={13} />
                        </button>
                        {/* Publish/Unpublish */}
                        <button onClick={() => handleTogglePublish(s)} title={s.status === "published" ? "Unpublish" : "Publish"} style={{ padding: "6px 8px", borderRadius: 8, border: "none", background: s.status === "published" ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", color: s.status === "published" ? "#ef4444" : "#10b981", cursor: "pointer", display: "flex" }}>
                          {s.status === "published" ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        {/* Feature */}
                        <button onClick={() => handleToggleFeatured(s)} title={s.is_featured ? "Unfeature" : "Feature"} style={{ padding: "6px 8px", borderRadius: 8, border: "none", background: "rgba(245,158,11,0.1)", color: "#f59e0b", cursor: "pointer", display: "flex" }}>
                          <Star size={13} fill={s.is_featured ? "#f59e0b" : "none"} />
                        </button>
                        {/* Archive */}
                        <button onClick={() => handleArchive(s)} title="Archive" style={{ padding: "6px 8px", borderRadius: 8, border: "none", background: "rgba(107,114,128,0.1)", color: "#6b7280", cursor: "pointer", display: "flex" }}>
                          <Archive size={13} />
                        </button>
                        {/* Delete */}
                        <button onClick={() => handleDelete(s)} title="Delete" style={{ padding: "6px 8px", borderRadius: 8, border: "none", background: "rgba(239,68,68,0.1)", color: "#ef4444", cursor: "pointer", display: "flex" }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Form Modal */}
      {showForm && (
        <ScholarshipForm
          dk={dk}
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
          saving={saving}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
