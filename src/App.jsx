import { useState, useEffect, useCallback, useRef } from "react";
import { Sun, Moon, Bell, LogOut, Menu, Search, X } from "lucide-react";

// ─── IMPORTS ──────────────────────────────────────────────────────
// Config & Helpers
import { ADMIN_EMAIL, WHO_OPTS, SEED_EVENTS, SEED_SANDBOX, SEED_CONTRIBS, SEED_POSTS, T } from "./config/constants";
import { genId, strColor, genHandle, genRefCode } from "./utils/helpers";
import { sbAuth, db } from "./services/supabase";

// UI Components
import GlobalCSS from "./components/ui/GlobalCSS";
import TokenPop from "./components/ui/TokenPop";
import Av from "./components/ui/Av";

// Shared Components
import SearchBar from "./components/shared/SearchBar";
import Sidebar from "./components/shared/Sidebar";
import RightPanel from "./components/shared/RightPanel";
import NotifPanel from "./components/shared/NotifPanel";
import BottomNav from "./components/shared/BottomNav";

// Views
import AuthScreen from "./views/AuthScreen";
import Onboarding from "./views/Onboarding";
import AdminApp from "./views/AdminApp";
import ProfileView from "./views/ProfileView";
import WalletView from "./views/WalletView";
import MessengerView from "./views/MessengerView";
import AdsManagerView from "./views/AdsManagerView";
import FeedView from "./views/FeedView";
import NetworkView from "./views/NetworkView";
import EventsView from "./views/EventsView";
import SandboxView from "./views/SandboxView";
import ContributeView from "./views/ContributeView";
import ColabView from "./views/ColabView";

// ─── OAUTH TOKEN DETECTION (runs before React) ────────────────────
(function detectOAuthReturn() {
  try {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash.slice(1));
      const token = params.get("access_token");
      const refresh = params.get("refresh_token") || "";
      const expiresIn = parseInt(params.get("expires_in") || "3600", 10);
      if (token) {
        const sess = {
          access_token: token,
          refresh_token: refresh,
          expires_at: Math.floor(Date.now() / 1000) + expiresIn,
        };
        sessionStorage.setItem("rs_oauth_return", JSON.stringify(sess));
        localStorage.setItem("rs_session", JSON.stringify(sess));
        // Clean the URL immediately so hash is gone before React reads it
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  } catch {}
})();

// ─── APP ROOT ─────────────────────────────────────────────────────
export default function App() {
  // Start in "loading" state if we detect an OAuth return or stored session
  // so the login form never flashes during auto-login
  const hasStoredSession = (() => {
    try {
      if (sessionStorage.getItem("rs_oauth_return")) return true;
      const s = JSON.parse(localStorage.getItem("rs_session") || "null");
      return s?.access_token && s?.expires_at > Math.floor(Date.now() / 1000);
    } catch { return false; }
  })();

  const [screen, setScreen] = useState(hasStoredSession ? "loading" : "auth");
  const [session, setSession] = useState(null);
  const [me, setMe] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [profiles, setProfiles] = useState({});
  const [bals, setBals] = useState({});
  const [dk, setDk] = useState(false);
  const [view, setView] = useState("feed");
  const [profUid, setProfUid] = useState(null);
  const [notifs, setNotifs] = useState([{ id: "n0", type: "token", msg: "Welcome to RightSignal!", ts: Date.now() - 60000, read: false }]);
  const [showN, setShowN] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [tokenPop, setTokenPop] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [activeTag, setActiveTag] = useState(null);

  const addNotif = useCallback(n => { setNotifs(ns => [{ id: genId(), ...n, ts: Date.now(), read: false }, ...ns]); }, []);

  useEffect(() => {
    if (screen !== "app" || !me) return;
    const timer = setInterval(() => loadNotifs(me), 15000);
    return () => clearInterval(timer);
  }, [screen, me]);
  const unread = notifs.filter(n => !n.read).length;
  const urlRef = useRef(new URLSearchParams(window.location.search).get("ref") || "");

  const strToColor = s => strColor(s);

  const loadProfiles = async () => {
    const rows = await db.get("rs_user_profiles", "order=created_at.desc");
    const map = {};
    (rows || []).forEach(r => { map[r.id] = { ...r, hue: strToColor(r.name || "?") }; });
    setProfiles(map);
    return map;
  };

  const loadBals = async () => {
    const rows = await db.get("rs_token_balances");
    const map = {};
    (rows || []).forEach(r => { map[r.uid] = r.balance; });
    setBals(map);
  };

  const loadNotifs = async uid => {
    try {
      const rows = await db.get("rs_notifications", `uid=eq.${uid}&order=created_at.desc&limit=40`);
      if (rows?.length) {
        setNotifs(ns => {
          const existingIds = new Set(ns.map(n => n.id));
          const fresh = rows
            .filter(r => !existingIds.has(r.id))
            .map(r => ({ id: r.id, type: r.type, msg: r.msg, ts: new Date(r.created_at).getTime(), read: r.read || false }));
          return [...fresh, ...ns];
        });
      }
    } catch {}
  };

  const seedIfNeeded = async () => {
    const [evs, sbx, ctb, pts] = await Promise.all([db.get("rs_events","select=id&limit=1"), db.get("rs_sandbox","select=id&limit=1"), db.get("rs_contributions","select=id&limit=1"), db.get("rs_posts","select=id&limit=1")]);
    if (!evs?.length) await db.postMany("rs_events", SEED_EVENTS);
    if (!sbx?.length) await db.postMany("rs_sandbox", SEED_SANDBOX);
    if (!ctb?.length) await db.postMany("rs_contributions", SEED_CONTRIBS);
    if (!pts?.length) await db.postMany("rs_posts", SEED_POSTS);
  };

  const seedAdmin = async () => {
    try {
      const existing = await db.get("rs_user_profiles", `email=eq.${ADMIN_EMAIL}&select=id`);
      if (existing?.length) {
        await db.patch("rs_user_profiles", `email=eq.${ADMIN_EMAIL}`, { is_admin: true, system_role: "admin" });
      }
    } catch {}
  };

  const handleAuth = async (sess, authUser, isNewUser, name) => {
    setSession(sess);
    setMe(authUser.id);
    if (sess?.access_token) {
      const toStore = { ...sess, expires_at: sess.expires_at || Math.floor(Date.now() / 1000) + 3600 };
      localStorage.setItem("rs_session", JSON.stringify(toStore));
    }
    seedIfNeeded();
    seedAdmin();

    const prof = await db.get("rs_user_profiles", `id=eq.${authUser.id}`);
    if (prof?.[0]) {
      const p = { ...prof[0], hue: strToColor(prof[0].name || "?") };
      setMyProfile(p);
      await Promise.all([loadProfiles(), loadBals(), loadNotifs(authUser.id)]);
      if (p.is_admin || p.system_role === "admin") setScreen("admin");
      else setScreen("app");
    } else {
      const displayName = name || authUser.user_metadata?.name || authUser.email?.split("@")[0] || "New User";
      const isAdminEmail = authUser.email === ADMIN_EMAIL;
      setMyProfile({ id: authUser.id, email: authUser.email, name: displayName, is_admin: isAdminEmail, system_role: isAdminEmail ? "admin" : "user" });
      if (isAdminEmail) {
        const handle = genHandle(displayName);
        const ref_code = genRefCode(displayName);
        await db.upsert("rs_user_profiles", { id: authUser.id, email: authUser.email, name: displayName, handle, bio: "", role: "Admin", who: "executive", interests: [], ref_code, is_admin: true, system_role: "admin" });
        await Promise.all([loadProfiles(), loadBals()]);
        setScreen("admin");
      } else {
        setScreen("onboarding");
      }
    }
  };

  const handleOnboardingDone = async ({ who, ints, refCode, refUid }) => {
    const nameToUse = myProfile?.name || "User";
    const handle = genHandle(nameToUse);
    const myRefCode = genRefCode(nameToUse);
    const isAdminEmail = myProfile?.email === ADMIN_EMAIL;

    const profileRow = { id: me, email: myProfile?.email || "", name: nameToUse, handle, bio: "", role: WHO_OPTS.find(w => w.id === who)?.label || "Member", who, interests: ints, ref_code: myRefCode, referred_by: refUid || null, is_admin: isAdminEmail, system_role: isAdminEmail ? "admin" : "user" };
    await db.upsert("rs_user_profiles", profileRow);

    let myBal = 0;
    if (refUid) {
      const refBalRows = await db.get("rs_token_balances", `uid=eq.${refUid}`);
      const refBal = (refBalRows[0]?.balance || 0) + 2;
      myBal = 1;
      await Promise.all([
        db.upsert("rs_token_balances", { uid: me, balance: 1 }),
        db.upsert("rs_token_balances", { uid: refUid, balance: refBal }),
        db.post("rs_token_txns", { uid: me, type: "earn", amount: 1, description: "Joined via referral" }),
        db.post("rs_token_txns", { uid: refUid, type: "earn", amount: 2, description: `${nameToUse} joined via your referral` }),
        db.post("rs_referrals", { referrer_uid: refUid, referee_uid: me, code_used: refCode }),
      ]);
      setBals(b => ({ ...b, [me]: 1, [refUid]: refBal }));
    } else {
      await db.upsert("rs_token_balances", { uid: me, balance: 0 });
      setBals(b => ({ ...b, [me]: 0 }));
    }

    const fullProfile = { ...profileRow, hue: strToColor(nameToUse) };
    setMyProfile(fullProfile);
    setProfiles(p => ({ ...p, [me]: fullProfile }));
    if (myBal > 0) { setNotifs(ns => [{ id: genId(), type: "token", msg: "◈ +1 SGN — Welcome referral bonus!", ts: Date.now(), read: false }, ...ns]); setTokenPop(myBal); }

    await Promise.all([loadProfiles(), loadBals()]);
    window.history.replaceState({}, "", window.location.pathname);
    if (isAdminEmail) setScreen("admin");
    else setScreen("app");
  };

  const handleSignOut = async () => {
    if (session?.access_token) await sbAuth.signOut(session.access_token);
    localStorage.removeItem("rs_session");
    sessionStorage.removeItem("rs_oauth_pending");
    sessionStorage.removeItem("rs_pkce_verifier");
    setSession(null); setMe(null); setMyProfile(null); setProfiles({}); setBals({}); setView("feed"); setScreen("auth");
  };

  const toggleBookmark = postId => {
    setBookmarks(bs => bs.includes(postId) ? bs.filter(b => b !== postId) : [...bs, postId]);
  };

  const navTo = v => { setView(v); setShowN(false); setProfUid(null); setSidebarOpen(false); };
  const openProfile = id => { setProfUid(id); setView("profile"); setShowN(false); setSidebarOpen(false); };
  const sidebarNav = v => { if (v === "profile") openProfile(me); else navTo(v); };
  const openMessage = uid => { setProfUid(uid); navTo("messages"); };
  const handleTag = tag => { setActiveTag(tag); navTo("feed"); };

  const [width, setWidth] = useState(window.innerWidth);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1100;
  const showRightPanel = width >= 1100 && !["messages", "ads"].includes(view);

  useEffect(() => {
    let cancelled = false;
    const trySession = async (sess) => {
      if (!sess?.access_token) return false;
      if (sess.expires_at && sess.expires_at < Math.floor(Date.now() / 1000)) {
        localStorage.removeItem("rs_session");
        sessionStorage.removeItem("rs_oauth_return");
        return false;
      }
      try {
        const u = await sbAuth.getUser(sess.access_token);
        if (!cancelled && u && u.id) {
          await handleAuth(sess, u, false, "");
          return true;
        }
      } catch {}
      localStorage.removeItem("rs_session");
      sessionStorage.removeItem("rs_oauth_return");
      return false;
    };

    (async () => {
      const oauthReturn = sessionStorage.getItem("rs_oauth_return");
      if (oauthReturn) {
        sessionStorage.removeItem("rs_oauth_return");
        try {
          const sess = JSON.parse(oauthReturn);
          if (await trySession(sess)) return;
        } catch {}
      }

      const stored = localStorage.getItem("rs_session");
      if (stored) {
        try {
          const sess = JSON.parse(stored);
          if (await trySession(sess)) return;
        } catch {}
        localStorage.removeItem("rs_session");
      }

      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        const params = new URLSearchParams(hash.slice(1));
        const token = params.get("access_token");
        if (token) {
          const sess = {
            access_token: token,
            refresh_token: params.get("refresh_token") || "",
            expires_at: Math.floor(Date.now() / 1000) + parseInt(params.get("expires_in") || "3600", 10),
          };
          localStorage.setItem("rs_session", JSON.stringify(sess));
          window.history.replaceState({}, "", window.location.pathname);
          await trySession(sess);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (screen === "loading") return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#040a14,#0c1929)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
      <GlobalCSS dk={true} />
      <div style={{ position: "relative", width: 80, height: 80 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2.5px solid transparent", borderTopColor: "#6366f1", borderRightColor: "#6366f150", animation: "spin 1.2s cubic-bezier(0.5,0,0.5,1) infinite" }} />
        <div style={{ position: "absolute", inset: 10, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#8b5cf6", borderLeftColor: "#8b5cf655", animation: "spin 0.8s linear infinite reverse" }} />
        <div style={{ position: "absolute", inset: 20, borderRadius: 14, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 32px rgba(99,102,241,.7)", animation: "pulse 2s ease-in-out infinite" }}>
          <span style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}>R</span>
        </div>
      </div>
      <span style={{ color: "rgba(160,185,255,.65)", fontSize: 13, fontWeight: 500, letterSpacing: "0.5px", animation: "pulse 2s ease-in-out infinite" }}>Signing you in…</span>
    </div>
  );
  
  if (screen === "auth") return <><GlobalCSS dk={false} /><AuthScreen onAuth={handleAuth} /></>;
  if (screen === "onboarding") return <><GlobalCSS dk={false} /><Onboarding user={myProfile || {}} onComplete={handleOnboardingDone} /></>;
  if (screen === "admin") return <AdminApp me={me} myProfile={myProfile} bals={bals} profiles={profiles} dk={dk} setDk={setDk} onSignOut={handleSignOut} />;

  const th = T(dk);

  const renderMain = () => {
    const common = { me, dk, bals, profiles, addNotif };
    switch (view) {
      case "profile": return <ProfileView uid={profUid || me} me={me} dk={dk} bals={bals} profiles={profiles} onBack={() => setView("feed")} setBals={setBals} onMessage={openMessage} addNotif={addNotif} />;
      case "wallet": return <WalletView me={me} dk={dk} bals={bals} setBals={setBals} myProfile={myProfile} />;
      case "messages": return <MessengerView me={me} dk={dk} profiles={profiles} initUid={profUid} onProfile={openProfile} />;
      case "ads": return <AdsManagerView me={me} dk={dk} myProfile={myProfile} />;
      case "feed": return <FeedView {...common} myProfile={myProfile} onProfile={openProfile} bookmarks={bookmarks} onBookmark={toggleBookmark} />;
      case "network": return <NetworkView {...common} onProfile={openProfile} />;
      case "events": return <EventsView dk={dk} addNotif={addNotif} />;
      case "sandbox": return <SandboxView me={me} dk={dk} myProfile={myProfile} addNotif={addNotif} />;
      case "contribute": return <ContributeView me={me} dk={dk} addNotif={addNotif} />;
      case "colab": return <ColabView me={me} dk={dk} profiles={profiles} bals={bals} onProfile={openProfile} addNotif={addNotif} />;
      default: return <FeedView {...common} myProfile={myProfile} onProfile={openProfile} bookmarks={bookmarks} onBookmark={toggleBookmark} />;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <GlobalCSS dk={dk} />
      {tokenPop && <TokenPop amount={tokenPop} onDone={() => setTokenPop(null)} />}

      {/* Desktop floating sidebar — fixed positioned, spacer reserves the lane */}
      {!isMobile && (
        <>
          <div style={{ width: 234, flexShrink: 0 }} />
          <Sidebar view={view} setView={sidebarNav} me={me} dk={dk} bals={bals} myProfile={myProfile} />
        </>
      )}

      {/* Mobile drawer sidebar */}
      {isMobile && (
        <Sidebar view={view} setView={sidebarNav} me={me} dk={dk} bals={bals} myProfile={myProfile}
          open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Floating Topbar */}
        <div className="rs-float-top" style={{ background: th.top, backdropFilter: th.blur, WebkitBackdropFilter: th.blur, border: `1px solid ${th.bdr}`, borderRadius: isMobile ? 18 : 20, margin: isMobile ? "10px 10px 0" : "12px 12px 0", padding: isMobile ? "8px 12px" : "9px 16px", display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, flexShrink: 0, zIndex: 50, boxShadow: dk ? "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)" : "0 8px 24px rgba(0,0,0,0.09), inset 0 1px 0 rgba(255,255,255,0.9)" }}>

          {/* Mobile inline search mode */}
          {isMobile && mobileSearchOpen ? (
            <>
              <button onClick={() => setMobileSearchOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt2, padding: 4, display: "flex", alignItems: "center", flexShrink: 0 }}><X size={18} /></button>
              <div className="rs-search-expand" style={{ flex: 1 }}><SearchBar dk={dk} profiles={profiles} onProfile={p => { openProfile(p); setMobileSearchOpen(false); }} onTag={t => { handleTag(t); setMobileSearchOpen(false); }} autoFocus /></div>
            </>
          ) : (
            <>
              {/* Left — logo (mobile) or search (desktop) */}
              {isMobile ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                  <button onClick={() => setSidebarOpen(true)} className="rs-icon-btn" style={{ background: "none", border: "none", cursor: "pointer", color: th.txt2, padding: 4, display: "flex", alignItems: "center" }}><Menu size={20} /></button>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#fff", fontWeight: 900, fontSize: 14 }}>R</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: th.txt, letterSpacing: "-0.3px" }}>RIGHTSIGNAL</span>
                  </div>
                </div>
              ) : (
                <SearchBar dk={dk} profiles={profiles} onProfile={openProfile} onTag={handleTag} />
              )}

              {/* Right controls */}
              <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 5 : 8, marginLeft: "auto", position: "relative", flexShrink: 0 }}>
                {isMobile && (
                  <button onClick={() => setMobileSearchOpen(true)} className="rs-icon-btn" style={{ background: "none", border: "none", cursor: "pointer", color: th.txt2, padding: "6px 5px", display: "flex", alignItems: "center" }}><Search size={18} /></button>
                )}
                <button onClick={() => navTo("wallet")} style={{ display: "flex", alignItems: "center", gap: 4, background: "linear-gradient(135deg,#78350f,#d97706)", border: "none", borderRadius: 10, padding: isMobile ? "5px 9px" : "5px 12px", cursor: "pointer", boxShadow: "0 0 12px rgba(245,158,11,.3)" }}>
                  <span style={{ fontSize: 12, color: "#fff" }}>◈</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{bals[me] ?? 0}</span>
                </button>
                {!isMobile && (
                  <button onClick={() => setDk(x => !x)} style={{ display: "flex", alignItems: "center", gap: 5, background: dk ? "rgba(59,130,246,.15)" : th.inp, border: `1px solid ${dk ? "#3b82f640" : th.inpB}`, borderRadius: 10, padding: "6px 10px", cursor: "pointer", color: dk ? "#3b82f6" : th.txt2 }}>
                    {dk ? <Sun size={14} /> : <Moon size={14} />}
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{dk ? "Light" : "Dark"}</span>
                  </button>
                )}
                {isMobile && (
                  <button onClick={() => setDk(x => !x)} className="rs-icon-btn" style={{ background: "none", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "6px 7px", cursor: "pointer", color: th.txt2, display: "flex", alignItems: "center" }}>
                    {dk ? <Sun size={14} /> : <Moon size={14} />}
                  </button>
                )}
                <button onClick={() => setShowN(x => !x)} className="rs-icon-btn" style={{ position: "relative", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: th.txt2, padding: 6 }}>
                  <Bell size={18} />
                  {unread > 0 && <span style={{ position: "absolute", top: 0, right: 0, width: 15, height: 15, borderRadius: "50%", background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 6px #ef4444", animation: "notifPop 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>{unread}</span>}
                </button>
                {showN && <NotifPanel notifs={notifs} setNotifs={setNotifs} onClose={() => setShowN(false)} dk={dk} onPoll={() => loadNotifs(me)} />}
                <div onClick={() => openProfile(me)} style={{ cursor: "pointer" }}><Av profile={myProfile || {}} size={30} bal={bals[me] ?? 0} /></div>
                {!isMobile && (
                  <button onClick={handleSignOut} title="Sign out" className="rs-icon-btn" style={{ background: "none", border: `1px solid ${th.bdr}`, borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: th.txt3, display: "flex", alignItems: "center" }}><LogOut size={14} /></button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Content area */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "10px 10px 96px" : "12px 16px 16px" }}>
            <div key={view} className="rs-page-in" style={{ maxWidth: 640, margin: "0 auto" }}>{renderMain()}</div>
          </div>
          {showRightPanel && (
            <div style={{ overflowY: "auto", padding: "12px 12px 12px 0", flexShrink: 0 }}>
              <RightPanel dk={dk} myProfile={myProfile} onProfile={openProfile} bals={bals} onWallet={() => navTo("wallet")} profiles={profiles} onTag={handleTag} />
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom navigation */}
      {isMobile && (
        <BottomNav view={view} setView={sidebarNav} dk={dk} bals={bals} me={me} />
      )}
    </div>
  );
}