// src/views/EventsView.jsx
import { useState, useEffect } from "react";
import { T, SEED_EVENTS, CAT_COLORS } from '../config/constants.js';
import { fmt, fmtDate } from '../utils/helpers.js';
import { db } from '../services/supabase.js';
import Spin from '../components/ui/Spin.jsx';
import Card from '../components/ui/Card.jsx';

function EventsView({ dk, addNotif }) {
  const th = T(dk);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const cats = ["All", "Technology", "Product", "Developer", "Leadership", "Design", "Startup"];

  useEffect(() => {
    (async () => {
      let data = await db.get("rs_events", "order=event_date.asc");
      if (!data?.length) { await db.postMany("rs_events", SEED_EVENTS); data = await db.get("rs_events", "order=event_date.asc") || []; }
      setEvents(data); setLoading(false);
    })();
  }, []);

  const filtered = filter === "All" ? events : events.filter(e => e.category === filter);

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: th.txt }}>Events</h2>
      <p style={{ color: th.txt2, fontSize: 14, margin: "0 0 14px" }}>Curated global events for the RightSignal community</p>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {cats.map(c => <button key={c} onClick={() => setFilter(c)} style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${filter === c ? CAT_COLORS[c] || "#3b82f6" : th.bdr}`, background: filter === c ? (CAT_COLORS[c] || "#3b82f6") + "18" : "transparent", color: filter === c ? (CAT_COLORS[c] || "#3b82f6") : th.txt2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{c}</button>)}
      </div>
      {loading ? <Spin dk={dk} msg="Loading events…" /> : filtered.map(ev => (
        <Card dk={dk} key={ev.id}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <span style={{ background: (CAT_COLORS[ev.category] || "#6b7280") + "18", color: CAT_COLORS[ev.category] || "#6b7280", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{ev.category}</span>
            <span style={{ background: "#10b98118", color: "#10b981", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{ev.is_free ? "FREE" : "PAID"}</span>
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px", color: th.txt }}>{ev.title}</h3>
          <p style={{ fontSize: 13, color: th.txt2, margin: "0 0 10px", lineHeight: 1.5 }}>{ev.description}</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", gap: 12, fontSize: 12, color: th.txt3 }}>
              <span>📅 {fmtDate(ev.event_date)}</span>
              <span>🌐 {ev.timezone}</span>
              {ev.popularity && <span>👥 {fmt(ev.popularity)}+</span>}
            </div>
            <button onClick={() => window.open(ev.url, "_blank")} style={{ background: "#3b82f6", border: "none", borderRadius: 8, padding: "6px 14px", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>View Event</button>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default EventsView;