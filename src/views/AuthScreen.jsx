import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, User, ArrowRight } from "lucide-react";
import { sbAuth } from "../services/supabase.js";

const darkBg = [
  "radial-gradient(ellipse 80% 70% at 15% 10%, rgba(99,102,241,0.20) 0%, transparent 55%)",
  "radial-gradient(ellipse 70% 70% at 85% 90%, rgba(139,92,246,0.15) 0%, transparent 55%)",
  "radial-gradient(ellipse 60% 50% at 60% 50%, rgba(59,130,246,0.09) 0%, transparent 60%)",
  "#04070f",
].join(",");

const inp = {
  display: "flex", alignItems: "center", gap: 10,
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.11)",
  borderRadius: 16, padding: "12px 16px", marginBottom: 12,
};
const inpField = { flex: 1, border: "none", outline: "none", background: "transparent", color: "#f0f4ff", fontSize: 14, fontFamily: "inherit" };

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email || !password) { setError("Email and password are required."); return; }
    setError(""); setBusy(true);
    try {
      if (mode === "signup") {
        const res = await sbAuth.signUp(email.trim(), password, name.trim() || "New User");
        if (res?.user) { setMode("login"); setError("Signup successful. Please sign in."); }
        else setError(res?.error_description || res?.msg || "Signup failed.");
      } else {
        const res = await sbAuth.signIn(email.trim(), password);
        if (res?.access_token) {
          const user = await sbAuth.getUser(res.access_token);
          if (user) { onAuth(res, user, false, name.trim()); return; }
          setError("Unable to load user details.");
        } else setError(res?.error_description || res?.msg || "Login failed.");
      }
    } catch { setError("Authentication failed. Please try again."); }
    setBusy(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: darkBg, backgroundAttachment: "fixed" }}>
      <div className="rs-scale-in" style={{ width: "min(440px, 100%)" }}>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 32px rgba(99,102,241,0.45)", margin: "0 auto 14px" }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 26, letterSpacing: "-1px" }}>R</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f0f4ff", letterSpacing: "-0.5px" }}>RightSignal</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(180,200,255,0.45)", letterSpacing: 2.5, textTransform: "uppercase", marginTop: 3 }}>Signal Over Noise</div>
          <p style={{ color: "rgba(180,205,255,0.5)", fontSize: 14, marginTop: 8 }}>Where founders &amp; investors meet</p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(28px) saturate(1.8)", WebkitBackdropFilter: "blur(28px) saturate(1.8)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 28, padding: "26px 28px" }}>

          <div style={{ display: "flex", gap: 4, marginBottom: 22, background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: 4 }}>
            {[["login","Sign In"],["signup","Sign Up"]].map(([tab, label]) => (
              <button key={tab} onClick={() => { setMode(tab); setError(""); }}
                style={{ flex: 1, padding: "9px", borderRadius: 11, border: "none", cursor: "pointer", background: mode === tab ? "rgba(99,102,241,0.8)" : "transparent", color: mode === tab ? "#fff" : "rgba(180,205,255,0.55)", fontWeight: mode === tab ? 700 : 500, fontSize: 13, backdropFilter: mode === tab ? "blur(10px)" : "none", boxShadow: mode === tab ? "0 4px 12px rgba(99,102,241,0.3)" : "none" }}>
                {label}
              </button>
            ))}
          </div>

          <button onClick={() => sbAuth.googleOAuth()}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "12px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.11)", background: "rgba(255,255,255,0.06)", color: "#f0f4ff", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 18 }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.10)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
            <span style={{ fontSize: 12, color: "rgba(180,205,255,0.32)" }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
          </div>

          {mode === "signup" && (
            <div style={inp}>
              <User size={15} color="rgba(180,205,255,0.38)" />
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={inpField} />
            </div>
          )}
          <div style={inp}>
            <Mail size={15} color="rgba(180,205,255,0.38)" />
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email" style={inpField} />
          </div>
          <div style={inp}>
            <Lock size={15} color="rgba(180,205,255,0.38)" />
            <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" style={inpField} />
            <button onClick={() => setShowPass(v => !v)} style={{ border: "none", background: "none", color: "rgba(180,205,255,0.38)", cursor: "pointer", padding: 0, display: "flex" }}>
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {error && (
            <div style={{ marginBottom: 14, color: error.startsWith("Signup successful") ? "#34d399" : "#fca5a5", fontSize: 13, textAlign: "center" }}>
              {error}
            </div>
          )}

          <button onClick={submit} disabled={busy} className="rs-btn-spring"
            style={{ width: "100%", padding: "13px", borderRadius: 16, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: busy ? 0.7 : 1, boxShadow: "0 8px 28px rgba(99,102,241,0.35)" }}>
            {busy ? "Working…" : mode === "login" ? "Sign In" : "Create Account"}
            {!busy && <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
