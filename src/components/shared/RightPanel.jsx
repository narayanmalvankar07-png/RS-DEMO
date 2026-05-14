import { ExternalLink, TrendingUp, Rocket, Briefcase, Zap, Code2, Palette, Globe, Brain, GraduationCap, Microscope, Sparkles, Building2, User } from "lucide-react";
import { T, WHO_OPTS } from "../../config/constants.js";
import Av from "../ui/Av.jsx";

const ROLE_ICON_MAP = {
  founder: Rocket, investor: TrendingUp, professional: Briefcase,
  entrepreneur: Zap, developer: Code2, designer: Palette,
  diplomat: Globe, selfemployed: Brain, student: GraduationCap,
  researcher: Microscope, creator: Sparkles, executive: Building2,
};

const TRENDING = [
  ["#startupsandbox", 361], ["#buildinpublic", 348], ["#startups", 227],
  ["#rightsignal", 121], ["#founders", 121],
];

export default function RightPanel({ dk, myProfile, onProfile, bals, onWallet, profiles, onTag }) {
  const th = T(dk);
  const balance = bals[myProfile?.id] ?? 0;
  const whoOpt = WHO_OPTS.find(w => w.id === myProfile?.who);
  const RoleIcon = whoOpt ? (ROLE_ICON_MAP[whoOpt.id] || User) : null;

  const glassCard = {
    borderRadius: 20,
    padding: "14px 16px",
    background: th.surf,
    backdropFilter: th.blur,
    WebkitBackdropFilter: th.blur,
    border: `1px solid ${th.bdr}`,
    marginBottom: 10,
  };

  const suggestedUsers = Object.values(profiles)
    .filter(p => p.id !== myProfile?.id && p.who)
    .slice(0, 3);

  return (
    <div style={{ width: 270, display: "flex", flexDirection: "column", gap: 0 }} className="rs-stagger">

      <div onClick={onWallet} className="rs-card" style={{
        ...glassCard,
        background: "linear-gradient(135deg,#92400e,#d97706,#f59e0b)",
        border: "1px solid rgba(245,158,11,0.3)",
        cursor: "pointer", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -16, right: -16, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
        <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: 1.8, marginBottom: 6 }}>Your Signal Tokens</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginBottom: 4 }}>◈ {balance} SGN</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 4 }}>
          tap to open wallet <ExternalLink size={10} />
        </div>
      </div>

      {whoOpt && RoleIcon && (
        <div style={glassCard}>
          <div style={{ fontSize: 9, fontWeight: 700, color: th.txt3, textTransform: "uppercase", letterSpacing: 1.8, marginBottom: 10 }}>Your Signal</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: `${whoOpt.c}18`,
              border: `1px solid ${whoOpt.c}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <RoleIcon size={18} color={whoOpt.c} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: th.txt }}>{whoOpt.label}</div>
              <div style={{ fontSize: 11, color: th.txt3 }}>Role</div>
            </div>
          </div>
        </div>
      )}

      <div style={glassCard}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <TrendingUp size={14} color="#f97316" />
          <span style={{ fontSize: 13, fontWeight: 700, color: th.txt }}>Trending (24h)</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {TRENDING.map(([tag, count]) => (
            <button key={tag} onClick={() => onTag(tag)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", width: "100%", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = th.surf2}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ fontSize: 13, color: "#6366f1", fontWeight: 600 }}>{tag}</span>
              <span style={{ fontSize: 11, color: th.txt3, fontWeight: 600 }}>{count}</span>
            </button>
          ))}
        </div>
      </div>

      {suggestedUsers.length > 0 && (
        <div style={glassCard}>
          <div style={{ fontSize: 13, fontWeight: 700, color: th.txt, marginBottom: 14 }}>Who to Align with</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {suggestedUsers.map(u => {
              const wo = WHO_OPTS.find(w => w.id === u.who);
              const UIcon = wo ? (ROLE_ICON_MAP[wo.id] || User) : User;
              return (
                <button key={u.id} onClick={() => onProfile(u.id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", border: "none", background: "transparent", cursor: "pointer", padding: 0, textAlign: "left" }}>
                  <Av profile={u} size={34} bal={bals[u.id] ?? 0} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: th.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: th.txt3, display: "flex", alignItems: "center", gap: 4 }}>
                      {wo && <UIcon size={10} color={wo.c} />}
                      {wo?.label || "Member"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
