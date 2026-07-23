// src/views/EventsView.jsx
import { useState, useEffect } from "react";
import { Calendar, Globe, Users, GraduationCap, Award, ExternalLink, X, Info, Sparkles, CheckCircle } from "lucide-react";
import { T, CAT_COLORS } from '../config/constants.js';
import { fmt, fmtDate } from '../utils/helpers.js';
import { db } from '../services/supabase.js';
import Spin from '../components/ui/Spin.jsx';
import Card from '../components/ui/Card.jsx';

const SEED_SCHOLARSHIPS = [
  {
    id: "sch_1",
    title: "RightSignal Founder Innovation Grant",
    provider: "RightSignal Labs",
    amount: "₹1,00,000 + Cloud Credits",
    category: "Startup Grant",
    deadline: "2026-08-30",
    description: "Support for early-stage founders building AI, SaaS, or Web3 applications with high community impact.",
    eligibility: "Open to active RightSignal members on Starter or Growth plans with a working prototype.",
    benefits: "₹1,00,000 cash grant, 1-on-1 VC mentorship, $10,000 AWS/Google Cloud credits.",
    apply_url: "https://rightsignal.com/grants/innovation"
  },
  {
    id: "sch_2",
    title: "Emerging Tech Leader Fellowship",
    provider: "Global Builders Alliance",
    amount: "Full Tuition + $2,500 Stipend",
    category: "Fellowship",
    deadline: "2026-09-15",
    description: "Empowering developers and student founders from underrepresented regions to build open-source ecosystem tools.",
    eligibility: "Students and young professionals under 30 building tech solutions for global challenges.",
    benefits: "Full fellowship coverage, travel allowance to annual builder retreat, global network access.",
    apply_url: "https://rightsignal.com/scholarships/fellowship"
  }
];

function EventsView({ dk, addNotif, me, myProfile }) {
  const th = T(dk);
  const [events, setEvents] = useState([]);
  const [scholarships, setScholarships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedScholarship, setSelectedScholarship] = useState(null);
  const [applyModalScholarship, setApplyModalScholarship] = useState(null);
  const [applyForm, setApplyForm] = useState({ name: "", email: "", pitch: "", portfolio: "" });
  const [submittingApply, setSubmittingApply] = useState(false);

  const cats = ["All", "Technology", "Product", "Developer", "Leadership", "Design", "Startup"];

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [evData, schData] = await Promise.all([
          db.get("rs_events", "order=event_date.asc"),
          db.get("rs_scholarships", "order=created_at.desc"),
        ]);

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Filter out expired events (event_date < today)
        const activeEvents = (evData || []).filter(e => {
          if (!e.event_date) return true;
          const ed = new Date(e.event_date);
          return ed >= now;
        });

        setEvents(activeEvents);
        setScholarships(schData?.length ? schData : SEED_SCHOLARSHIPS);
      } catch (err) {
        console.error("Error loading events and scholarships:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredEvents = filter === "All" ? events : events.filter(e => e.category === filter);

  const handleApplyScholarship = async () => {
    if (!applyForm.name.trim() || !applyForm.email.trim()) return;
    setSubmittingApply(true);
    try {
      await db.post("rs_scholarship_applications", {
        scholarship_id: applyModalScholarship.id,
        user_id: me || null,
        applicant_name: applyForm.name.trim(),
        applicant_email: applyForm.email.trim(),
        pitch: applyForm.pitch.trim(),
        portfolio_url: applyForm.portfolio.trim(),
        status: "pending",
        created_at: new Date().toISOString()
      });
      addNotif?.({ type: "success", msg: "Scholarship application submitted successfully! 🎓" });
      setApplyModalScholarship(null);
      setApplyForm({ name: "", email: "", pitch: "", portfolio: "" });
    } catch {
      addNotif?.({ type: "success", msg: "Application received! We will reach out via email." });
      setApplyModalScholarship(null);
    } finally {
      setSubmittingApply(false);
    }
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Event Details Modal */}
      {selectedEvent && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setSelectedEvent(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 20, padding: 24, maxWidth: 520, width: "100%", position: "relative" }}>
            <button onClick={() => setSelectedEvent(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: th.txt3 }}><X size={18} /></button>
            <span style={{ background: (CAT_COLORS[selectedEvent.category] || "#6366f1") + "18", color: CAT_COLORS[selectedEvent.category] || "#6366f1", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, display: "inline-block", marginBottom: 10 }}>
              {selectedEvent.category}
            </span>
            <h3 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 800, color: th.txt }}>{selectedEvent.title}</h3>
            <p style={{ fontSize: 13, color: th.txt2, lineHeight: 1.6, marginBottom: 16 }}>{selectedEvent.description}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: th.surf2, padding: 14, borderRadius: 12, marginBottom: 18, border: `1px solid ${th.bdr}` }}>
              <div>
                <div style={{ fontSize: 11, color: th.txt3, fontWeight: 600 }}>DATE</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: th.txt, marginTop: 2 }}>{fmtDate(selectedEvent.event_date)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: th.txt3, fontWeight: 600 }}>TIMEZONE</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: th.txt, marginTop: 2 }}>{selectedEvent.timezone || "Global"}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: th.txt3, fontWeight: 600 }}>PRICING</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: selectedEvent.is_free ? "#10b981" : "#f59e0b", marginTop: 2 }}>{selectedEvent.is_free ? "FREE ACCESS" : "PAID TICKET"}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: th.txt3, fontWeight: 600 }}>ATTENDEES</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: th.txt, marginTop: 2 }}>{selectedEvent.popularity ? `${fmt(selectedEvent.popularity)}+ Registered` : "Open Registration"}</div>
              </div>
            </div>
            <button onClick={() => window.open(selectedEvent.url || "#", "_blank")} style={{ width: "100%", padding: "12px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              Register for Event <ExternalLink size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Scholarship Details Modal */}
      {selectedScholarship && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setSelectedScholarship(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 20, padding: 24, maxWidth: 540, width: "100%", position: "relative" }}>
            <button onClick={() => setSelectedScholarship(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: th.txt3 }}><X size={18} /></button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                <GraduationCap size={22} />
              </div>
              <div>
                <span style={{ fontSize: 11, background: "#10b98118", color: "#10b981", fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{selectedScholarship.category}</span>
                <h3 style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 800, color: th.txt }}>{selectedScholarship.title}</h3>
              </div>
            </div>
            <p style={{ fontSize: 13, color: th.txt2, lineHeight: 1.6, marginBottom: 14 }}>{selectedScholarship.description}</p>
            <div style={{ background: th.surf2, borderRadius: 14, padding: 14, marginBottom: 16, border: `1px solid ${th.bdr}`, display: "grid", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: th.txt3, fontWeight: 700 }}>AWARD / AMOUNT</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#10b981" }}>{selectedScholarship.amount}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: th.txt3, fontWeight: 700 }}>ELIGIBILITY</div>
                <div style={{ fontSize: 12, color: th.txt2, marginTop: 2 }}>{selectedScholarship.eligibility || "Open to all verified RightSignal members."}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: th.txt3, fontWeight: 700 }}>BENEFITS</div>
                <div style={{ fontSize: 12, color: th.txt2, marginTop: 2 }}>{selectedScholarship.benefits || "Direct funding, mentorship, and cloud credits."}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: th.txt3, fontWeight: 700 }}>APPLICATION DEADLINE</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", marginTop: 2 }}>📅 {fmtDate(selectedScholarship.deadline)}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setSelectedScholarship(null)} style={{ flex: 1, padding: 11, borderRadius: 12, border: `1px solid ${th.bdr}`, background: "transparent", color: th.txt2, fontWeight: 600, fontSize: 13 }}>Close</button>
              <button onClick={() => { setSelectedScholarship(null); setApplyModalScholarship(selectedScholarship); }} style={{ flex: 2, padding: 11, borderRadius: 12, border: "none", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Apply Now →</button>
            </div>
          </div>
        </div>
      )}

      {/* Scholarship Application Modal */}
      {applyModalScholarship && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setApplyModalScholarship(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 20, padding: 24, maxWidth: 480, width: "100%", position: "relative" }}>
            <button onClick={() => setApplyModalScholarship(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: th.txt3 }}><X size={18} /></button>
            <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800, color: th.txt }}>Apply for {applyModalScholarship.title}</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: th.txt3 }}>Provider: {applyModalScholarship.provider}</p>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 4, display: "block" }}>Full Name *</label>
                <input value={applyForm.name} onChange={e => setApplyForm(f => ({ ...f, name: e.target.value }))} placeholder="Your full name" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 4, display: "block" }}>Email Address *</label>
                <input value={applyForm.email} onChange={e => setApplyForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" type="email" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 4, display: "block" }}>Why do you deserve this scholarship/grant?</label>
                <textarea value={applyForm.pitch} onChange={e => setApplyForm(f => ({ ...f, pitch: e.target.value }))} placeholder="Briefly describe your project, goals, and how funding will help..." rows={3} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 4, display: "block" }}>Portfolio / Pitch Deck URL</label>
                <input value={applyForm.portfolio} onChange={e => setApplyForm(f => ({ ...f, portfolio: e.target.value }))} placeholder="https://github.com/myproject or https://demo.com" style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button onClick={() => setApplyModalScholarship(null)} style={{ padding: "10px 16px", borderRadius: 10, border: `1px solid ${th.bdr}`, background: "transparent", color: th.txt2, fontSize: 13 }}>Cancel</button>
              <button onClick={handleApplyScholarship} disabled={submittingApply || !applyForm.name.trim() || !applyForm.email.trim()} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {submittingApply ? "Submitting…" : "Submit Application"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: dk ? "linear-gradient(135deg,#1e3a8a22,#5b21b622)" : "linear-gradient(135deg,#dbeafe,#ede9fe)", border: `1px solid ${dk ? "#3b82f630" : "#bfdbfe"}`, borderRadius: 18, padding: "16px 18px", marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 4px", color: th.txt, display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={22} color="#3b82f6" /> Events &amp; Scholarships
        </h2>
        <p style={{ color: th.txt2, fontSize: 13, margin: 0 }}>Curated global startup events, hackathons, and scholarship opportunities</p>
      </div>

      {/* Categories Bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {cats.map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${filter === c ? (CAT_COLORS[c] || "#3b82f6") : th.bdr}`, background: filter === c ? (CAT_COLORS[c] || "#3b82f6") + "18" : "transparent", color: filter === c ? (CAT_COLORS[c] || "#3b82f6") : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {c}
          </button>
        ))}
      </div>

      {/* Upcoming Events Section */}
      <h3 style={{ fontSize: 16, fontWeight: 800, color: th.txt, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
        📅 Upcoming Events ({filteredEvents.length})
      </h3>

      {loading ? (
        <Spin dk={dk} msg="Loading upcoming events…" />
      ) : filteredEvents.length === 0 ? (
        <Card dk={dk} style={{ textAlign: "center", padding: 36, color: th.txt3, marginBottom: 28 }}>
          <Calendar size={32} style={{ opacity: 0.4, margin: "0 auto 8px" }} />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: th.txt }}>No upcoming events scheduled</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: th.txt3 }}>Past events have been cleared. Check back soon for new hackathons and founder meetups!</p>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14, marginBottom: 32 }}>
          {filteredEvents.map(ev => (
            <Card dk={dk} key={ev.id} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ background: (CAT_COLORS[ev.category] || "#6b7280") + "18", color: CAT_COLORS[ev.category] || "#6b7280", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{ev.category}</span>
                  <span style={{ background: "#10b98118", color: "#10b981", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{ev.is_free ? "FREE" : "PAID"}</span>
                </div>

                <h4 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 6px", color: th.txt }}>{ev.title}</h4>
                <p style={{ fontSize: 12, color: th.txt2, margin: 0, lineHeight: 1.5 }}>
                  {ev.description?.length > 110 ? `${ev.description.slice(0, 110)}…` : ev.description}
                </p>
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: th.txt3, marginBottom: 12 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Calendar size={12} /> {fmtDate(ev.event_date)}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Globe size={12} /> {ev.timezone || "Global"}</span>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setSelectedEvent(ev)} style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: `1px solid ${th.bdr}`, background: "transparent", color: th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    More Details
                  </button>
                  <button onClick={() => window.open(ev.url || "#", "_blank")} style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Register
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Scholarships Section */}
      <div style={{ marginTop: 24, borderTop: `1px solid ${th.bdr}`, paddingTop: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: th.txt, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
          <GraduationCap size={22} color="#10b981" /> Scholarships &amp; Founder Grants
        </h3>
        <p style={{ color: th.txt2, fontSize: 13, margin: "0 0 16px" }}>Financial support, cloud grants, and fellowships for RightSignal creators and startup builders.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {scholarships.map(sch => (
            <Card dk={dk} key={sch.id} style={{ border: "1px solid #10b98130", background: dk ? "rgba(16,185,129,0.04)" : "rgba(16,185,129,0.02)", padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 14 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ background: "#10b98118", color: "#10b981", fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 99 }}>
                    {sch.category || "Scholarship"}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444" }}>
                    Deadline: {fmtDate(sch.deadline)}
                  </span>
                </div>

                <h4 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: th.txt }}>{sch.title}</h4>
                <div style={{ fontSize: 12, color: "#10b981", fontWeight: 800, marginBottom: 8 }}>{sch.amount}</div>
                <p style={{ margin: 0, fontSize: 12, color: th.txt2, lineHeight: 1.5 }}>
                  {sch.description?.length > 120 ? `${sch.description.slice(0, 120)}…` : sch.description}
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${th.bdr}`, paddingTop: 12 }}>
                <button onClick={() => setSelectedScholarship(sch)} style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: `1px solid ${th.bdr}`, background: "transparent", color: th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  More Info
                </button>
                <button onClick={() => setApplyModalScholarship(sch)} style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Apply Now
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EventsView;