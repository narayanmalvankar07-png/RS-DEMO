import { useState } from "react";
import { ArrowRight, Sparkles, Hash, Rocket, TrendingUp, Briefcase, Zap, Code2, Palette, Globe, Brain, GraduationCap, Microscope, Building2, Cpu, Bot, Activity, Music, Link, Heart, Gamepad2, Plane, Smile } from "lucide-react";
import { T, WHO_OPTS, INT_OPTS } from "../config/constants.js";

const ROLE_ICON_MAP = {
  founder: Rocket, investor: TrendingUp, professional: Briefcase,
  entrepreneur: Zap, developer: Code2, designer: Palette,
  diplomat: Globe, selfemployed: Brain, student: GraduationCap,
  researcher: Microscope, creator: Sparkles, executive: Building2,
};
const INT_ICON_MAP = {
  tech: Cpu, startups: Rocket, ai: Bot, finance: TrendingUp, news: Globe,
  sports: Activity, music: Music, design: Palette, science: Microscope,
  crypto: Link, health: Heart, gaming: Gamepad2, travel: Plane, fun: Smile,
};

export default function Onboarding({ user, onComplete }) {
  const [who, setWho] = useState(user?.who || "founder");
  const [ints, setInts] = useState(user?.interests || []);
  const [refCode, setRefCode] = useState("");
  const [refUid, setRefUid] = useState("");

  const darkBg = [
    "radial-gradient(ellipse 80% 70% at 15% 10%, rgba(99,102,241,0.18) 0%, transparent 55%)",
    "radial-gradient(ellipse 70% 70% at 85% 90%, rgba(139,92,246,0.14) 0%, transparent 55%)",
    "#04070f",
  ].join(",");

  const toggleInt = id => setInts(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);

  const inputStyle = {
    flex: 1, borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)",
    padding: "12px 16px", background: "rgba(255,255,255,0.06)",
    color: "#f0f4ff", outline: "none", fontSize: 14, fontFamily: "inherit",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", background: darkBg, backgroundAttachment: "fixed" }}>
      <div className="rs-scale-in" style={{ width: "min(760px, 100%)", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(28px) saturate(1.8)", WebkitBackdropFilter: "blur(28px) saturate(1.8)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 32, padding: "32px 28px", color: "#f0f4ff" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 24px rgba(99,102,241,0.4)", flexShrink: 0 }}>
            <Sparkles size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" }}>Welcome to RightSignal</h1>
            <p style={{ margin: 0, color: "rgba(180,205,255,0.6)", fontSize: 14, marginTop: 2 }}>Tell us about yourself to personalize your experience.</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(180,205,255,0.7)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>I am a</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
              {WHO_OPTS.map(opt => {
                const Icon = ROLE_ICON_MAP[opt.id] || Sparkles;
                const active = who === opt.id;
                return (
                  <button key={opt.id} onClick={() => setWho(opt.id)} style={{
                    padding: "12px 14px", borderRadius: 16,
                    border: active ? `2px solid ${opt.c}` : "1px solid rgba(255,255,255,0.10)",
                    background: active ? `${opt.c}18` : "rgba(255,255,255,0.04)",
                    color: active ? opt.c : "rgba(240,244,255,0.75)",
                    cursor: "pointer", textAlign: "left",
                    boxShadow: active ? `0 0 20px ${opt.c}25` : "none",
                    transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                  }}>
                    <Icon size={18} style={{ marginBottom: 6, display: "block" }} />
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{opt.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(180,205,255,0.7)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Interests</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {INT_OPTS.map(opt => {
                const Icon = INT_ICON_MAP[opt.id] || Hash;
                const active = ints.includes(opt.id);
                return (
                  <button key={opt.id} onClick={() => toggleInt(opt.id)} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 12px", borderRadius: 12,
                    border: active ? `1.5px solid ${opt.c}` : "1px solid rgba(255,255,255,0.10)",
                    background: active ? `${opt.c}18` : "rgba(255,255,255,0.04)",
                    color: active ? opt.c : "rgba(240,244,255,0.65)",
                    cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 500,
                    transition: "all 0.2s",
                  }}>
                    <Icon size={12} />
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(180,205,255,0.7)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Referral Code (optional)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input value={refCode} onChange={e => setRefCode(e.target.value)} placeholder="Referral code (e.g. QWERT-59BA)" style={inputStyle} />
                <input value={refUid} onChange={e => setRefUid(e.target.value)} placeholder="Referrer user ID (optional)" style={inputStyle} />
              </div>
            </div>
          </div>
        </div>

        <button onClick={() => onComplete({ who, ints, refCode, refUid })} className="rs-btn-spring" style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          width: "100%", padding: "14px 20px", borderRadius: 18, border: "none",
          background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff",
          fontWeight: 700, fontSize: 15, cursor: "pointer",
          boxShadow: "0 8px 32px rgba(99,102,241,0.35)",
        }}>
          Complete Setup <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
