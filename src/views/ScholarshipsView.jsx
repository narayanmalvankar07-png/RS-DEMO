import { useEffect, useState } from "react";
import { T } from "../config/constants.js";
import Card from "../components/ui/Card.jsx";
import GlobalCSS from "../components/ui/GlobalCSS.jsx";

export default function ScholarshipsView({ me, dk, profiles, addNotif, isMobile, onProfile }) {
  const th = T(dk);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <GlobalCSS dk={dk} />
      <div style={{ padding: isMobile ? "12px 8px" : "24px 32px", maxWidth: 960, margin: "0 auto" }}>
        <h1 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 800, color: th.txt, marginBottom: 8 }}>Scholarships</h1>
        <p style={{ fontSize: isMobile ? 14 : 16, color: th.txt2, marginBottom: 24 }}>
          Discover scholarship opportunities available to RightSignal students.
        </p>
        <Card style={{ background: th.surf2, padding: 24, borderRadius: 16, boxShadow: dk ? "0 8px 24px rgba(0,0,0,0.4)" : "0 8px 24px rgba(0,0,0,0.1)" }}>
          {loading ? (
            <div style={{ textAlign: "center", color: th.txt2 }}>Loading scholarships...</div>
          ) : (
            <div style={{ color: th.txt2, textAlign: "center" }}>
              No scholarships available yet. Stay tuned for updates!
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
