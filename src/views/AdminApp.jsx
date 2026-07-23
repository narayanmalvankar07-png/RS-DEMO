import { useState, useEffect } from "react";
import { ShieldCheck, Users, Activity, LayoutDashboard, FileText, Settings, LogOut, Sun, Moon, GraduationCap, PlusCircle, Trash2 } from "lucide-react";
import { T, ROLES } from "../config/constants.js";
import Card from "../components/ui/Card.jsx";
import Av from "../components/ui/Av.jsx";
import SGN from "../components/ui/SGN.jsx";
import { db } from "../services/supabase.js";
import { toast } from "sonner";
import AdminScholarshipsView from "./AdminScholarshipsView.jsx";

export default function AdminApp({ me, myProfile, bals, profiles, dk, setDk, onSignOut }) {
  const th = T(dk);
  const [tab, setTab] = useState("overview");
  const userCount = Object.keys(profiles).length;
  const tokenTotal = Object.values(bals).reduce((sum, v) => sum + (v || 0), 0);
  const roleLabel = ROLES[myProfile?.system_role] || "Admin";

  const [scholarships, setScholarships] = useState([]);
  const [loadingSch, setLoadingSch] = useState(false);
  const [showAddSch, setShowAddSch] = useState(false);
  const [schForm, setSchForm] = useState({
    title: "", provider: "RightSignal", amount: "₹50,000", category: "Startup Grant",
    deadline: "2026-12-31", description: "", eligibility: "", benefits: "", apply_url: ""
  });
  const [submittingSch, setSubmittingSch] = useState(false);

  const tabs = [
    { id: "overview", icon: LayoutDashboard, label: "Overview" },
    { id: "users", icon: Users, label: "Members" },
    { id: "scholarships", icon: GraduationCap, label: "Scholarships" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  useEffect(() => {
    if (tab === "scholarships") {
      (async () => {
        setLoadingSch(true);
        try {
          const res = await db.get("rs_scholarships", "order=created_at.desc");
          setScholarships(res || []);
        } catch { }
        setLoadingSch(false);
      })();
    }
  }, [tab]);

  const handleCreateScholarship = async () => {
    if (!schForm.title.trim() || !schForm.amount.trim()) return;
    setSubmittingSch(true);
    try {
      const payload = {
        title: schForm.title.trim(),
        provider: schForm.provider.trim() || "RightSignal Labs",
        amount: schForm.amount.trim(),
        category: schForm.category || "Grant",
        deadline: schForm.deadline || "2026-12-31",
        description: schForm.description.trim(),
        eligibility: schForm.eligibility.trim(),
        benefits: schForm.benefits.trim(),
        apply_url: schForm.apply_url.trim(),
        created_at: new Date().toISOString()
      };
      const saved = await db.post("rs_scholarships", payload);
      const newSch = saved || { id: `sch_${Date.now()}`, ...payload };
      setScholarships(prev => [newSch, ...prev]);
      toast.success("Scholarship added!");
      setShowAddSch(false);
      setSchForm({ title: "", provider: "RightSignal", amount: "₹50,000", category: "Startup Grant", deadline: "2026-12-31", description: "", eligibility: "", benefits: "", apply_url: "" });
    } catch {
      toast.error("Failed to add scholarship.");
    } finally {
      setSubmittingSch(false);
    }
  };

  const handleDeleteScholarship = async (id) => {
    try {
      await db.del("rs_scholarships", `id=eq.${id}`);
      setScholarships(prev => prev.filter(s => s.id !== id));
      toast.success("Scholarship deleted.");
    } catch { }
  };

  const allUsers = Object.values(profiles);

  return (
    <div style={{ minHeight: "100vh", background: th.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ background: th.top, borderBottom: `1px solid ${th.bdr}`, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(14px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>R</span>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: th.txt }}>Admin Portal</div>
            <div style={{ fontSize: 11, color: th.txt3 }}>RightSignal. · {roleLabel}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setDk(v => !v)} style={{ padding: "7px 12px", borderRadius: 10, background: th.surf2, color: th.txt2, border: `1px solid ${th.bdr}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
            {dk ? <Sun size={13} /> : <Moon size={13} />}{dk ? "Light" : "Dark"}
          </button>
          <button onClick={onSignOut} style={{ padding: "7px 14px", borderRadius: 10, background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600 }}>
            <LogOut size={13} />Sign out
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1 }}>
        <div style={{ width: 200, background: th.side, borderRight: `1px solid ${th.bdr}`, padding: "16px 10px", flexShrink: 0 }}>
          {tabs.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setTab(id)} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 10px", borderRadius: 10, border: "none", background: tab === id ? (dk ? "rgba(59,130,246,.15)" : "#eff6ff") : "transparent", color: tab === id ? "#3b82f6" : th.txt2, fontSize: 13, fontWeight: tab === id ? 700 : 500, cursor: "pointer", textAlign: "left", marginBottom: 2, borderLeft: tab === id ? "2px solid #3b82f6" : "2px solid transparent" }}>
              <Icon size={16} />{label}
            </button>
          ))}
          <div style={{ borderTop: `1px solid ${th.bdr}`, marginTop: 12, paddingTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px" }}>
              <Av profile={myProfile || {}} size={28} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: th.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{myProfile?.name || "Admin"}</div>
                <div style={{ fontSize: 10, color: "#3b82f6", fontWeight: 700 }}>Admin</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
          {tab === "overview" && (
            <div>
              <h2 style={{ margin: "0 0 18px", fontSize: 22, fontWeight: 800, color: th.txt }}>Platform Overview</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
                {[
                  { icon: Users, title: "Total Members", value: userCount, color: "#3b82f6" },
                  { icon: Activity, title: "Total SGN Distributed", value: `◈ ${tokenTotal}`, color: "#f59e0b" },
                  { icon: ShieldCheck, title: "Your Role", value: roleLabel, color: "#10b981" },
                  { icon: FileText, title: "Platform", value: "RightSignal v1", color: "#8b5cf6" },
                ].map(card => {
                  const Icon = card.icon;
                  return (
                    <Card key={card.title} dk={dk} style={{ padding: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: `${card.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Icon size={16} color={card.color} />
                        </div>
                        <div style={{ color: th.txt3, fontSize: 11, fontWeight: 700 }}>{card.title}</div>
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: th.txt }}>{card.value}</div>
                    </Card>
                  );
                })}
              </div>

              <Card dk={dk} style={{ padding: 20 }}>
                <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: th.txt }}>Top SGN Holders</h3>
                <div style={{ display: "grid", gap: 10 }}>
                  {Object.entries(bals).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([uid, bal]) => {
                    const p = profiles[uid] || { name: uid.slice(0, 10) };
                    return (
                      <div key={uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: th.surf2, border: `1px solid ${th.bdr}` }}>
                        <Av profile={p} size={32} bal={bal} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: th.txt }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: th.txt3 }}>@{p.handle || "—"}</div>
                        </div>
                        <SGN n={bal} />
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {tab === "users" && (
            <div>
              <h2 style={{ margin: "0 0 18px", fontSize: 22, fontWeight: 800, color: th.txt }}>Members ({userCount})</h2>
              {allUsers.length === 0 ? (
                <Card dk={dk} style={{ padding: 32, textAlign: "center" }}>
                  <p style={{ color: th.txt3 }}>No members yet.</p>
                </Card>
              ) : (
                <Card dk={dk} style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${th.bdr}` }}>
                          {["Member", "Handle", "Role", "SGN", "System Role"].map(h => (
                            <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: th.txt3, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers.map(u => (
                          <tr key={u.id} style={{ borderBottom: `1px solid ${th.bdr}` }}>
                            <td style={{ padding: "12px 16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <Av profile={u} size={32} />
                                <div style={{ fontSize: 13, fontWeight: 700, color: th.txt }}>{u.name}</div>
                              </div>
                            </td>
                            <td style={{ padding: "12px 16px", fontSize: 12, color: th.txt3 }}>@{u.handle || "—"}</td>
                            <td style={{ padding: "12px 16px", fontSize: 12, color: th.txt2 }}>{u.role || u.who || "—"}</td>
                            <td style={{ padding: "12px 16px" }}><SGN n={bals[u.id] ?? 0} size="sm" /></td>
                            <td style={{ padding: "12px 16px" }}>
                              <span style={{ fontSize: 11, background: u.is_admin ? "#ef444418" : `rgba(59,130,246,.12)`, color: u.is_admin ? "#ef4444" : "#3b82f6", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>
                                {ROLES[u.system_role] || "Member"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}

          {tab === "scholarships" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: th.txt }}>Scholarships &amp; Grants Management</h2>
                  <p style={{ margin: 0, fontSize: 13, color: th.txt3 }}>Add and manage global scholarships displayed in the Events section</p>
                </div>
                <button onClick={() => setShowAddSch(v => !v)} style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, #10b981, #059669)", border: "none", borderRadius: 10, padding: "9px 16px", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  <PlusCircle size={15} /> Add Scholarship
                </button>
              </div>

              {showAddSch && (
                <Card dk={dk} style={{ marginBottom: 20, padding: 20 }}>
                  <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800, color: th.txt }}>Create New Scholarship</h3>
                  <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 4, display: "block" }}>Title *</label>
                        <input value={schForm.title} onChange={e => setSchForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. AI Founder Grant" style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 4, display: "block" }}>Provider</label>
                        <input value={schForm.provider} onChange={e => setSchForm(f => ({ ...f, provider: e.target.value }))} placeholder="e.g. RightSignal Labs" style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }} />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 4, display: "block" }}>Amount / Grant *</label>
                        <input value={schForm.amount} onChange={e => setSchForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. ₹1,00,000" style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 4, display: "block" }}>Category</label>
                        <select value={schForm.category} onChange={e => setSchForm(f => ({ ...f, category: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }}>
                          {["Startup Grant", "Fellowship", "Developer Scholarship", "Research Grant"].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 4, display: "block" }}>Deadline</label>
                        <input type="date" value={schForm.deadline} onChange={e => setSchForm(f => ({ ...f, deadline: e.target.value }))} style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }} />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 4, display: "block" }}>Description</label>
                      <textarea value={schForm.description} onChange={e => setSchForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief summary of the grant..." rows={2} style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box", fontFamily: "inherit" }} />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: th.txt3, marginBottom: 4, display: "block" }}>Eligibility Criteria</label>
                      <input value={schForm.eligibility} onChange={e => setSchForm(f => ({ ...f, eligibility: e.target.value }))} placeholder="Who is eligible?" style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none", fontSize: 13, boxSizing: "border-box" }} />
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
                    <button onClick={() => setShowAddSch(false)} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${th.bdr}`, background: "transparent", color: th.txt2, fontSize: 13 }}>Cancel</button>
                    <button onClick={handleCreateScholarship} disabled={submittingSch || !schForm.title.trim()} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#10b981", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                      {submittingSch ? "Saving…" : "Publish Scholarship"}
                    </button>
                  </div>
                </Card>
              )}

              {scholarships.length === 0 ? (
                <Card dk={dk} style={{ padding: 36, textAlign: "center", color: th.txt3 }}>
                  <GraduationCap size={32} style={{ opacity: 0.4, margin: "0 auto 8px" }} />
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>No scholarships added yet.</p>
                </Card>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {scholarships.map(sch => (
                    <Card dk={dk} key={sch.id} style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 10, background: "#10b98118", color: "#10b981", padding: "2px 7px", borderRadius: 99, fontWeight: 700 }}>{sch.category}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: "#10b981" }}>{sch.amount}</span>
                        </div>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: th.txt }}>{sch.title}</h4>
                        <div style={{ fontSize: 12, color: th.txt3, marginTop: 2 }}>{sch.description}</div>
                      </div>
                      <button onClick={() => handleDeleteScholarship(sch.id)} style={{ background: "#ef444418", border: "1px solid #ef444430", color: "#ef4444", borderRadius: 8, padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600 }}>
                        <Trash2 size={13} /> Delete
                      </button>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "settings" && (
            <div>
              <h2 style={{ margin: "0 0 18px", fontSize: 22, fontWeight: 800, color: th.txt }}>Settings</h2>
              <Card dk={dk} style={{ padding: 24 }}>
                <div style={{ display: "grid", gap: 18 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: th.txt, marginBottom: 4 }}>Platform Name</div>
                    <div style={{ fontSize: 13, color: th.txt3 }}>RightSignal — A Global Ecosystem for Growth</div>
                  </div>
                  <div style={{ borderTop: `1px solid ${th.bdr}`, paddingTop: 18 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: th.txt, marginBottom: 4 }}>Admin Email</div>
                    <div style={{ fontSize: 13, color: th.txt3 }}>{myProfile?.email || "—"}</div>
                  </div>
                  <div style={{ borderTop: `1px solid ${th.bdr}`, paddingTop: 18 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: th.txt, marginBottom: 8 }}>Appearance</div>
                    <button onClick={() => setDk(v => !v)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, border: `1px solid ${th.bdr}`, background: th.surf2, color: th.txt, cursor: "pointer", fontSize: 13 }}>
                      {dk ? <Sun size={15} /> : <Moon size={15} />}{dk ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

