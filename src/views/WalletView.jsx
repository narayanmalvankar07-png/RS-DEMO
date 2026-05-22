import { useState, useEffect } from "react";
import { Copy, Check, History, Gift, ExternalLink, Sparkles } from "lucide-react";
import { T } from "../config/constants.js";
import { db } from "../services/supabase.js";
import Card from "../components/ui/Card.jsx";
import Spin from "../components/ui/Spin.jsx";
import { toast } from "sonner";

function ago(ts) {
  const s = (Date.now() - new Date(ts).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${~~(s / 60)}m ago`;
  if (s < 86400) return `${~~(s / 3600)}h ago`;
  return `${~~(s / 86400)}d ago`;
}

function CopyButton({ text, dk }) {
  const th = T(dk);
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => { });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, border: `1px solid ${th.bdr}`, background: copied ? "#10b98118" : th.surf2, color: copied ? "#10b981" : th.txt2, cursor: "pointer", fontSize: 12, fontWeight: 600, flexShrink: 0, transition: "all .2s" }}>
      {copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function WalletView({ me, bals, setBals, dk, myProfile, onProfileUpdate, addNotif }) {
  const th = T(dk);
  const balance = bals[me] ?? 0;
  const [txns, setTxns] = useState([]);
  const [loadingTxns, setLoadingTxns] = useState(true);
  const [referrals, setReferrals] = useState([]);

  const [claimCode, setClaimCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");

  const handleClaim = async (e) => {
    if (e) e.preventDefault();
    const code = claimCode.trim().toUpperCase();
    if (!code) {
      setClaimError("Please enter a referral code.");
      return;
    }
    if (code === myProfile?.ref_code?.toUpperCase()) {
      setClaimError("You cannot claim your own referral code.");
      return;
    }

    setClaiming(true);
    setClaimError("");

    try {
      const refRows = await db.get("rs_user_profiles", `ref_code=eq.${code}`);
      if (!refRows || refRows.length === 0) {
        setClaimError("Invalid referral code. Please check and try again.");
        setClaiming(false);
        return;
      }

      const referrer = refRows[0];
      const referrerUid = referrer.id;

      if (referrerUid === me) {
        setClaimError("You cannot claim your own referral code.");
        setClaiming(false);
        return;
      }

      const existingRefs = await db.get("rs_referrals", `referee_uid=eq.${me}`);
      if (existingRefs && existingRefs.length > 0) {
        setClaimError("You have already claimed a referral code.");
        setClaiming(false);
        return;
      }

      const myCurrentBal = bals[me] ?? 0;
      const refBalRows = await db.get("rs_token_balances", `uid=eq.${referrerUid}`);
      const refCurrentBal = refBalRows?.[0]?.balance || 0;

      const myNewBal = myCurrentBal + 1;
      const refNewBal = refCurrentBal + 2;

      await Promise.all([
        db.upsert("rs_token_balances", { uid: me, balance: myNewBal }),
        db.upsert("rs_token_balances", { uid: referrerUid, balance: refNewBal }),
        db.post("rs_token_txns", { uid: me, type: "earn", amount: 1, description: `Claimed referral code ${code}` }),
        db.post("rs_token_txns", { uid: referrerUid, type: "earn", amount: 2, description: `${myProfile?.name || "A friend"} joined using your code` }),
        db.post("rs_referrals", { referrer_uid: referrerUid, referee_uid: me, code_used: code }),
        db.patch("rs_user_profiles", `id=eq.${me}`, { referred_by: referrerUid }),
      ]);

      setBals((prev) => ({
        ...prev,
        [me]: myNewBal,
        [referrerUid]: refNewBal,
      }));

      if (onProfileUpdate) {
        onProfileUpdate(me, { referred_by: referrerUid });
      }

      toast.success("◈ +1 SGN — Referral code claimed successfully!");
      if (addNotif) {
        addNotif({
          id: Date.now().toString(),
          type: "token",
          msg: `◈ +1 SGN — Welcome referral bonus!`,
          ts: Date.now(),
          read: false,
        });
      }

      const freshTxns = await db.get("rs_token_txns", `uid=eq.${me}&order=created_at.desc&limit=30`);
      setTxns(freshTxns || []);
    } catch (err) {
      console.error("Claim referral error:", err);
      setClaimError("An unexpected error occurred. Please try again.");
    } finally {
      setClaiming(false);
    }
  };

  useEffect(() => {
    Promise.all([
      db.get("rs_token_txns", `uid=eq.${me}&order=created_at.desc&limit=30`),
      db.get("rs_referrals", `referrer_uid=eq.${me}`),
    ]).then(([t, r]) => {
      setTxns(t || []);
      setReferrals(r || []);
      setLoadingTxns(false);
    });
  }, [me]);

  const earned = txns.filter(t => t.type === "earn").reduce((s, t) => s + (t.amount || 0), 0);
  const redeemed = txns.filter(t => t.type === "spend").reduce((s, t) => s + (t.amount || 0), 0);
  const refCode = myProfile?.ref_code || "—";
  const refLink = `${window.location.origin}?ref=${refCode}`;

  const shareLinks = [
    {
      label: "WhatsApp",
      color: "#25D366",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.549 4.099 1.508 5.818L0 24l6.335-1.493A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.795 9.795 0 0 1-5.027-1.383l-.36-.214-3.762.886.945-3.658-.236-.376A9.785 9.785 0 0 1 2.182 12C2.182 6.579 6.579 2.182 12 2.182c5.421 0 9.818 4.397 9.818 9.818 0 5.421-4.397 9.818-9.818 9.818z" />
        </svg>
      ),
      url: `https://wa.me/?text=${encodeURIComponent(`Join RightSignal and earn SGN tokens! Use my referral: ${refLink}`)}`,
    },
    {
      label: "Twitter / X",
      color: "#000",
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join RightSignal — signal over noise for founders & investors! Use my referral: ${refLink}`)}`,
    },
    {
      label: "Telegram",
      color: "#26A5E4",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.04 9.61c-.148.658-.537.818-1.084.508l-3-2.21-1.447 1.393c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.903.612z" />
        </svg>
      ),
      url: `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("Join RightSignal and earn SGN tokens!")}`,
    },
    {
      label: "LinkedIn",
      color: "#0A66C2",
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(refLink)}`,
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#d97706,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 18px rgba(245,158,11,.3)" }}>
          <span style={{ fontSize: 22, color: "#fff" }}>◈</span>
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: th.txt }}>Signal Wallet</h2>
          <p style={{ margin: 0, color: th.txt3, fontSize: 12 }}>Tokens earned through referrals only</p>
        </div>
      </div>

      <div style={{ borderRadius: 18, padding: "22px 22px", marginBottom: 16, background: "linear-gradient(135deg,#92400e,#d97706,#f59e0b)", boxShadow: "0 8px 32px rgba(245,158,11,.25)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,.06)" }} />
        <div style={{ position: "absolute", bottom: -30, left: 100, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,.04)" }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.7)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Total Balance</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 18 }}>
          <span style={{ fontSize: 44, fontWeight: 900, color: "#fff", lineHeight: 1 }}>◈ {balance}</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,.8)" }}>SGN</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[["Balance", balance], ["Redeemed", redeemed], ["Total Earned", earned]].map(([label, val]) => (
            <div key={label} style={{ background: "rgba(0,0,0,.2)", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{val}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.65)", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {!myProfile?.referred_by && (
        <Card dk={dk} style={{ padding: 20, marginBottom: 14, background: dk ? "rgba(245,158,11,.03)" : "rgba(245,158,11,.01)", border: "1px solid rgba(245,158,11,.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Sparkles size={16} color="#f59e0b" className="rs-pulse" />
            <span style={{ fontSize: 15, fontWeight: 700, color: th.txt }}>Have a Referral Code?</span>
          </div>
          <p style={{ margin: "0 0 14px 0", color: th.txt3, fontSize: 12, lineHeight: 1.4 }}>
            Enter a friend's referral code to claim your welcome bonus. You'll get <strong style={{ color: "#10b981" }}>+1 SGN</strong> and they'll receive <strong style={{ color: "#f59e0b" }}>+2 SGN</strong>!
          </p>
          <form onSubmit={handleClaim} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={claimCode}
                onChange={(e) => {
                  setClaimCode(e.target.value);
                  if (claimError) setClaimError("");
                }}
                disabled={claiming}
                placeholder="E.G. ABCDE-1234"
                style={{
                  flex: 1,
                  borderRadius: 10,
                  border: `1px solid ${claimError ? "#ef4444" : th.bdr}`,
                  padding: "10px 14px",
                  background: th.surf2,
                  color: th.txt,
                  outline: "none",
                  fontSize: 14,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                  fontFamily: "monospace",
                }}
              />
              <button
                type="submit"
                disabled={claiming || !claimCode.trim()}
                className="rs-btn-spring"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: claiming || !claimCode.trim() ? th.bdr : "linear-gradient(135deg,#d97706,#f59e0b)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: claiming || !claimCode.trim() ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  boxShadow: claiming || !claimCode.trim() ? "none" : "0 4px 12px rgba(245,158,11,.2)",
                }}
              >
                {claiming ? "Claiming..." : "Claim Code"}
              </button>
            </div>
            {claimError && (
              <div style={{ color: "#ef4444", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                ⚠️ {claimError}
              </div>
            )}
          </form>
        </Card>
      )}

      <Card dk={dk} style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Gift size={17} color="#f59e0b" />
            <span style={{ fontSize: 15, fontWeight: 700, color: th.txt }}>Referral Program</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, background: "#f59e0b18", color: "#f59e0b", padding: "3px 10px", borderRadius: 99, border: "1px solid #f59e0b30" }}>
            You +2 SGN · Friend +1 SGN
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
          <div style={{ background: dk ? "linear-gradient(135deg,#1a1200,#120d00)" : "linear-gradient(135deg,#fffbeb,#fef3c7)", border: "1px solid #f59e0b30", borderRadius: 14, padding: "16px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#f59e0b", marginBottom: 4 }}>+2 SGN</div>
            <div style={{ fontSize: 12, color: th.txt3 }}>You earn per referral</div>
          </div>
          <div style={{ background: dk ? "linear-gradient(135deg,#0a1f0a,#071207)" : "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "1px solid #10b98130", borderRadius: 14, padding: "16px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#10b981", marginBottom: 4 }}>+1 SGN</div>
            <div style={{ fontSize: 12, color: th.txt3 }}>Your friend earns</div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: th.txt3, marginBottom: 6 }}>Your Referral Code</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "10px 14px" }}>
            <span style={{ flex: 1, fontSize: 16, fontWeight: 800, color: "#f59e0b", letterSpacing: 2, fontFamily: "monospace" }}>{refCode}</span>
            <CopyButton text={refCode} dk={dk} />
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: th.txt3, marginBottom: 6 }}>Your Referral Link</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: th.surf2, border: `1px solid ${th.bdr}`, borderRadius: 10, padding: "10px 14px" }}>
            <ExternalLink size={13} color={th.txt3} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 12, color: th.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{refLink}</span>
            <CopyButton text={refLink} dk={dk} />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: th.txt3, marginBottom: 8 }}>Share via</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {shareLinks.map(s => (
              <button key={s.label} onClick={() => window.open(s.url, "_blank")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 10, border: "none", background: s.color, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {s.icon}{s.label}
              </button>
            ))}
          </div>
        </div>

        {referrals.length > 0 && (
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${th.bdr}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: th.txt3, marginBottom: 6 }}>Successful referrals</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: th.txt }}>{referrals.length} <span style={{ fontSize: 13, fontWeight: 400, color: th.txt3 }}>friend{referrals.length !== 1 ? "s" : ""} joined</span></div>
          </div>
        )}
      </Card>

      <Card dk={dk} style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <History size={16} color={th.txt3} />
          <div style={{ fontSize: 15, fontWeight: 700, color: th.txt }}>Transaction History</div>
        </div>
        {loadingTxns ? <Spin dk={dk} msg="Loading…" /> : txns.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: th.txt3, fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
            No transactions yet. Share your referral link to start earning!
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {txns.map((t, i) => (
              <div key={t.id || i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: th.surf2, border: `1px solid ${th.bdr}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: th.txt }}>{t.description || (t.type === "earn" ? "Earned" : "Spent")}</div>
                  <div style={{ fontSize: 11, color: th.txt3, marginTop: 2 }}>{t.created_at ? ago(t.created_at) : ""}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: t.type === "earn" ? "#10b981" : "#ef4444" }}>
                  {t.type === "earn" ? "+" : "−"}◈ {t.amount}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
