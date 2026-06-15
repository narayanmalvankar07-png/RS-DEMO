import { useState } from "react";
import { ArrowRight, Sparkles, Hash, Rocket, TrendingUp, Briefcase, Zap, Code2, Palette, Globe, Brain, GraduationCap, Microscope, Building2, Cpu, Bot, Activity, Music, Link, Heart, Gamepad2, Plane, Smile, MapPin, Phone, Loader2 } from "lucide-react";
import { T, WHO_OPTS, INT_OPTS } from "../config/constants.js";

const ROLE_ICON_MAP = {
  founder: Rocket, investor: TrendingUp, professional: Briefcase,
  venturecapitalist: Zap, developer: Code2, designer: Palette,
  diplomat: Globe, selfemployed: Brain, student: GraduationCap,
  researcher: Microscope, creator: Sparkles, executive: Building2,
};
const INT_ICON_MAP = {
  tech: Cpu, startups: Rocket, ai: Bot, finance: TrendingUp, news: Globe,
  sports: Activity, music: Music, design: Palette, science: Microscope,
  crypto: Link, health: Heart, gaming: Gamepad2, travel: Plane, fun: Smile,
};

const COUNTRIES = [
  { iso: "us", code: "+1", name: "US/CA" }, { iso: "gb", code: "+44", name: "UK" },
  { iso: "in", code: "+91", name: "IN" }, { iso: "au", code: "+61", name: "AU" },
  { iso: "cn", code: "+86", name: "CN" }, { iso: "de", code: "+49", name: "DE" },
  { iso: "fr", code: "+33", name: "FR" }, { iso: "jp", code: "+81", name: "JP" },
  { iso: "br", code: "+55", name: "BR" }, { iso: "ae", code: "+971", name: "AE" },
  { iso: "sa", code: "+966", name: "SA" }, { iso: "sg", code: "+65", name: "SG" },
  { iso: "za", code: "+27", name: "ZA" }, { iso: "ng", code: "+234", name: "NG" },
  { iso: "mx", code: "+52", name: "MX" }, { iso: "id", code: "+62", name: "ID" },
  { iso: "it", code: "+39", name: "IT" }, { iso: "es", code: "+34", name: "ES" },
  { iso: "nl", code: "+31", name: "NL" }, { iso: "se", code: "+46", name: "SE" },
  { iso: "ch", code: "+41", name: "CH" }, { iso: "kr", code: "+82", name: "KR" },
  { iso: "tr", code: "+90", name: "TR" }, { iso: "ar", code: "+54", name: "AR" },
  { iso: "co", code: "+57", name: "CO" }, { iso: "ph", code: "+63", name: "PH" },
  { iso: "vn", code: "+84", name: "VN" }, { iso: "pk", code: "+92", name: "PK" },
  { iso: "bd", code: "+880", name: "BD" }, { iso: "ru", code: "+7", name: "RU" },
  { iso: "eg", code: "+20", name: "EG" }, { iso: "ke", code: "+254", name: "KE" },
  { iso: "gh", code: "+233", name: "GH" }, { iso: "ca", code: "+1", name: "CA" },
  { iso: "nz", code: "+64", name: "NZ" }, { iso: "ie", code: "+353", name: "IE" },
  { iso: "il", code: "+972", name: "IL" }, { iso: "my", code: "+60", name: "MY" },
  { iso: "th", code: "+66", name: "TH" }
];

export default function Onboarding({ user, onComplete }) {
  const [who, setWho] = useState(user?.who || "founder");
  const [ints, setInts] = useState(user?.interests || []);
  const urlRef = new URLSearchParams(window.location.search).get("ref") || "";
  const [refCode, setRefCode] = useState(urlRef);
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState(user?.location || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [countryCode, setCountryCode] = useState(user?.countryCode || "+1");
  const [detecting, setDetecting] = useState(false);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        if (res.ok) {
          const data = await res.json();
          const city = data.address.city || data.address.town || data.address.village || data.address.suburb || "";
          const country = data.address.country || "";
          setLocation(city && country ? `${city}, ${country}` : data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          
          const isoCode = data.address?.country_code?.toLowerCase();
          const codeMap = {};
          COUNTRIES.forEach(c => codeMap[c.iso] = c.code);
          
          if (isoCode && codeMap[isoCode]) {
            setCountryCode(codeMap[isoCode]);
          }
        } else {
          setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
      } catch (err) {
        setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      } finally {
        setDetecting(false);
      }
    }, (err) => {
      console.error(err);
      alert("Failed to retrieve location: " + err.message);
      setDetecting(false);
    });
  };

  const isValid = who && location.trim() && phone.trim();

  const handleSubmit = async () => {
    if (submitting || !isValid) return;
    setSubmitting(true);
    try {
      await onComplete({ who, ints, refCode, location, phone, countryCode });
    } catch (err) {
      setSubmitting(false);
    }
  };

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
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(180,205,255,0.7)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Location *</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Enter location (e.g. Paris, France)" style={inputStyle} />
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={detecting}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 16,
                    padding: "0 16px",
                    color: "#f0f4ff",
                    cursor: detecting ? "not-allowed" : "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.2s",
                    whiteSpace: "nowrap",
                    flexShrink: 0
                  }}
                >
                  {detecting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <MapPin size={14} />}
                  {detecting ? "Detecting..." : "Detect"}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(180,205,255,0.7)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Phone Number (Private) *</div>
              <div style={{ display: "flex", gap: 8 }}>
                <select 
                  value={countryCode} 
                  onChange={e => setCountryCode(e.target.value)} 
                  style={{ 
                    ...inputStyle, 
                    flex: "0 0 110px", 
                    appearance: "none", 
                    backgroundImage: "url(\"data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23b4cdff%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E\")",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 12px top 50%",
                    backgroundSize: "10px auto",
                    paddingRight: 30
                  }}
                >
                  {COUNTRIES.map(c => (
                    <option key={c.iso} value={c.code} style={{ background: "#0f172a", color: "#f0f4ff" }}>
                      {c.code} ({c.name})
                    </option>
                  ))}
                </select>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 555-0199" style={inputStyle} />
              </div>
              <div style={{ fontSize: 11, color: "rgba(180,205,255,0.45)", marginTop: 4 }}>This information is secure and will never be shared publicly.</div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(180,205,255,0.7)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Referral Code (optional)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input value={refCode} onChange={e => setRefCode(e.target.value.toUpperCase())} placeholder="Referral code (e.g. QWERT-59BA)" style={inputStyle} />
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={submitting || !isValid} className="rs-btn-spring" style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          width: "100%", padding: "14px 20px", borderRadius: 18, border: "none",
          background: (submitting || !isValid) ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg,#6366f1,#8b5cf6)", 
          color: (submitting || !isValid) ? "rgba(255,255,255,0.35)" : "#fff",
          fontWeight: 700, fontSize: 15, cursor: (submitting || !isValid) ? "not-allowed" : "pointer",
          boxShadow: (submitting || !isValid) ? "none" : "0 8px 32px rgba(99,102,241,0.35)",
          transition: "all 0.2s"
        }}>
          {submitting ? "Completing Setup..." : "Complete Setup"} {!submitting && <ArrowRight size={18} />}
        </button>
      </div>
    </div>
  );
}
