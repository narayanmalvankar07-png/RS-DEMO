// src/components/shared/SearchBar.jsx
import { useState, useEffect, useRef } from "react";
import { Search, X, Hash } from "lucide-react";
import { T } from '../../config/constants.js';
import Av from '../ui/Av.jsx';

function SearchBar({ dk, profiles, onProfile, onTag }) {
  const th = T(dk);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState({ users: [], tags: [] });
  const ref = useRef();

  useEffect(() => {
    if (!q.trim()) { setResults({ users: [], tags: [] }); setOpen(false); return; }
    const lower = q.toLowerCase();
    const users = Object.values(profiles).filter(p => p.name?.toLowerCase().includes(lower) || p.handle?.toLowerCase().includes(lower) || p.bio?.toLowerCase().includes(lower)).slice(0, 5);
    const tagPool = ["#rightsignal","#startupsandbox","#buildinpublic","#founders","#ai","#tech","#startups","#finance","#crypto","#design"];
    const tags = tagPool.filter(t => t.includes(lower) && lower.startsWith("#")).slice(0, 4);
    setResults({ users, tags });
    setOpen(true);
  }, [q, profiles]);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", flex: 1, maxWidth: 320 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: th.inp, borderRadius: 10, padding: "7px 12px", border: `1px solid ${th.inpB}` }}>
        <Search size={13} style={{ color: th.txt3, flexShrink: 0 }} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => q.trim() && setOpen(true)}
          placeholder="Search users, posts, hashtags…"
          style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: th.txt, width: "100%" }}
        />
        {q && <button onClick={() => { setQ(""); setOpen(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: th.txt3, display: "flex", padding: 0 }}><X size={12} /></button>}
      </div>
      {open && (results.users.length > 0 || results.tags.length > 0) && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 12, boxShadow: `0 10px 40px rgba(0,0,0,${dk ? .5 : .12})`, zIndex: 200, maxHeight: 320, overflowY: "auto", marginTop: 4 }}>
          {results.users.length > 0 && (
            <>
              <div style={{ padding: "8px 12px 4px", fontSize: 11, fontWeight: 700, color: th.txt3, letterSpacing: 0.5 }}>PEOPLE</div>
              {results.users.map(u => (
                <div key={u.id} onClick={() => { onProfile(u.id); setOpen(false); setQ(""); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", cursor: "pointer", borderRadius: 8 }}>
                  <Av profile={u} size={32} />
                  <div><div style={{ fontSize: 13, fontWeight: 600, color: th.txt }}>{u.name}</div><div style={{ fontSize: 11, color: th.txt3 }}>{u.handle ? `@${u.handle}` : u.email}</div></div>
                </div>
              ))}
            </>
          )}
          {results.tags.length > 0 && (
            <>
              <div style={{ padding: "8px 12px 4px", fontSize: 11, fontWeight: 700, color: th.txt3, letterSpacing: 0.5 }}>HASHTAGS</div>
              {results.tags.map(t => (
                <div key={t} onClick={() => { onTag?.(t); setOpen(false); setQ(""); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer" }}>
                  <Hash size={14} color="#3b82f6" />
                  <span style={{ fontSize: 13, color: "#3b82f6", fontWeight: 600 }}>{t}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchBar;