import { useState } from "react";
import { PlusCircle, Users, Sparkles, ArrowRight } from "lucide-react";
import { T } from "../config/constants.js";
import Card from "../components/ui/Card.jsx";
import Av from "../components/ui/Av.jsx";

const initialProjects = [
  { id: "proj-1", title: "AI Startup Matchmaker", description: "Connect founders with investors using AI signals.", members: ["seed"], status: "Open" },
  { id: "proj-2", title: "Community Growth Hub", description: "Build a collaborative space for startup teams and mentors.", members: [], status: "Open" },
];

export default function ColabView({ me, dk, profiles, onProfile, addNotif }) {
  const th = T(dk);
  const [projects, setProjects] = useState(initialProjects);
  const [showCreate, setShowCreate] = useState(false);
  const [newProject, setNewProject] = useState({ title: "", description: "" });

  const createProject = () => {
    if (!newProject.title.trim()) return;
    setProjects(prev => [{ ...newProject, id: `proj-${Date.now()}`, members: [me], status: "Open" }, ...prev]);
    setNewProject({ title: "", description: "" });
    setShowCreate(false);
    addNotif?.({ type: "success", msg: "Collab project created!", ts: Date.now(), read: false });
  };

  const joinProject = id => {
    setProjects(prev => prev.map(project => project.id === id ? { ...project, members: project.members.includes(me) ? project.members : [...project.members, me] } : project));
    addNotif?.({ type: "success", msg: "Joined collaboration!", ts: Date.now(), read: false });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, color: th.txt }}>Collaborate</h2>
          <p style={{ margin: 0, color: th.txt3 }}>Create or join projects with other builders.</p>
        </div>
        <button onClick={() => setShowCreate(v => !v)} style={{ display: "flex", alignItems: "center", gap: 8, border: "none", borderRadius: 12, padding: "12px 16px", background: "#3b82f6", color: "#fff", cursor: "pointer" }}><PlusCircle size={18} />New project</button>
      </div>

      {showCreate && (
        <Card dk={dk} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input value={newProject.title} onChange={e => setNewProject(prev => ({ ...prev, title: e.target.value }))} placeholder="Project title" style={{ width: "100%", padding: 12, borderRadius: 12, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none" }} />
            <textarea value={newProject.description} onChange={e => setNewProject(prev => ({ ...prev, description: e.target.value }))} placeholder="Project description" rows={4} style={{ width: "100%", padding: 12, borderRadius: 12, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, outline: "none" }} />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={createProject} style={{ display: "flex", alignItems: "center", gap: 8, border: "none", borderRadius: 12, padding: "12px 18px", background: "#10b981", color: "#fff", cursor: "pointer" }}>Create <ArrowRight size={16} /></button>
            </div>
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {projects.map(project => (
          <Card dk={dk} key={project.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: th.txt }}>{project.title}</h3>
                <p style={{ margin: "8px 0 0", color: th.txt3 }}>{project.description}</p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: project.status === "Open" ? "#10b981" : "#94a3b8", padding: "5px 10px", borderRadius: 999, background: project.status === "Open" ? "#10b98120" : "#94a3b820" }}>{project.status}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Users size={18} color={th.txt3} />
                <span style={{ color: th.txt3, fontSize: 13 }}>{project.members.length} member{project.members.length !== 1 ? "s" : ""}</span>
              </div>
              <button onClick={() => joinProject(project.id)} style={{ border: "none", borderRadius: 12, padding: "10px 16px", background: "#3b82f6", color: "#fff", cursor: "pointer" }}>{project.members.includes(me) ? "Joined" : "Join"}</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
