// src/views/EventsView.jsx
import { useState, useEffect } from "react";
import { Calendar, Globe, ExternalLink, X } from "lucide-react";
import { T, CAT_COLORS } from '../config/constants.js';
import { fmt, fmtDate } from '../utils/helpers.js';
import { db } from '../services/supabase.js';
import Spin from '../components/ui/Spin.jsx';
import Card from '../components/ui/Card.jsx';

function EventsView({ dk }) {
  const th = T(dk);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const cats = ["All", "Technology", "Product", "Developer", "Leadership", "Design", "Startup"];

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const evData = await db.get("rs_events", "order=event_date.asc");

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Filter out expired events (event_date < today)
        const activeEvents = (evData || []).filter(e => {
          if (!e.event_date) return true;
          const ed = new Date(e.event_date);
          return ed >= now;
        });

        setEvents(activeEvents);
      } catch (err) {
        console.error("Error loading events:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredEvents = filter === "All" ? events : events.filter(e => e.category === filter);

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

      {/* Header */}
      <div style={{ background: dk ? "linear-gradient(135deg,#1e3a8a22,#5b21b622)" : "linear-gradient(135deg,#dbeafe,#ede9fe)", border: `1px solid ${dk ? "#3b82f630" : "#bfdbfe"}`, borderRadius: 18, padding: "16px 18px", marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 4px", color: th.txt, display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={22} color="#3b82f6" /> Events
        </h2>
        <p style={{ color: th.txt2, fontSize: 13, margin: 0 }}>Curated global startup events, hackathons, and founder meetups</p>
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
    </div>
  );
}

export default EventsView;