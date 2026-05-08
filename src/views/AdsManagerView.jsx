import { useMemo } from "react";
import { Megaphone, DollarSign, Settings, BarChart2 } from "lucide-react";
import { T, ROLES } from "../config/constants.js";
import Card from "../components/ui/Card.jsx";

export default function AdsManagerView({ dk, myProfile }) {
  const th = T(dk);
  const isAdmin = [ROLES.admin, ROLES.growth_catalyst].includes(myProfile?.system_role);
  const campaigns = useMemo(() => [
    { id: "camp1", name: "Launch promotion", budget: 1200, status: "Live" },
    { id: "camp2", name: "Founder growth", budget: 850, status: "Review" },
  ], []);

  if (!isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <Card dk={dk} style={{ padding: 24, textAlign: "center" }}>
          <Megaphone size={32} color="#f97316" />
          <h2 style={{ marginTop: 16, color: th.txt }}>Access denied</h2>
          <p style={{ color: th.txt3 }}>You need admin permissions to manage ads.</p>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, color: th.txt }}>Ads Manager</h2>
          <p style={{ margin: 0, color: th.txt3 }}>Monitor campaign spend and conversion opportunities.</p>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: 8, background: "#3b82f6", color: "#fff", border: "none", padding: "12px 16px", borderRadius: 12, cursor: "pointer" }}><DollarSign size={16} />New campaign</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 20 }}>
        {[{ title: "Budget", value: "$2,050", icon: DollarSign }, { title: "Campaigns", value: "2 active", icon: BarChart2 }, { title: "Performance", value: "+18% ROI", icon: Settings }].map(item => {
          const Icon = item.icon;
          return (
            <Card dk={dk} key={item.title} style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Icon size={18} color="#2563eb" />
                <div style={{ fontSize: 12, color: th.txt3, fontWeight: 700 }}>{item.title}</div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: th.txt }}>{item.value}</div>
            </Card>
          );
        })}
      </div>
      <Card dk={dk} style={{ padding: 24 }}>
        <h3 style={{ margin: 0, fontSize: 18, color: th.txt, marginBottom: 16 }}>Current campaigns</h3>
        <div style={{ display: "grid", gap: 14 }}>
          {campaigns.map(campaign => (
            <div key={campaign.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, background: th.surf2, border: `1px solid ${th.bdr}` }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: th.txt }}>{campaign.name}</div>
                <div style={{ fontSize: 12, color: th.txt3 }}>{campaign.status}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: th.txt }}>${campaign.budget}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
