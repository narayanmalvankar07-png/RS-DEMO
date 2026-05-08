// src/utils/helpers.js

// Time formatting
export const ago = d => { const s = (Date.now() - d) / 1000; if (s < 60) return "just now"; if (s < 3600) return `${~~(s / 60)}m`; if (s < 86400) return `${~~(s / 3600)}h`; return `${~~(s / 86400)}d`; };

// Number formatting
export const fmt = n => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

// Date formatting
export const fmtDate = t => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

// ID generation
export const genId = () => Math.random().toString(36).slice(2, 10);
export const hexStr = n => Array.from({ length: n }, () => "0123456789abcdef"[~~(Math.random() * 16)]).join("");
export const genHandle = n => n.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 20) + "_" + genId().slice(0, 4);
export const genRefCode = n => n.toUpperCase().replace(/\s+/g, "").slice(0, 5) + "-" + hexStr(4).toUpperCase();

// Color generation
export const strColor = s => { const c = ["#3b82f6","#10b981","#8b5cf6","#f97316","#f43f5e","#06b6d4","#ec4899","#f59e0b"]; let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffff; return c[Math.abs(h) % c.length]; };

// File handling
export const fileToB64 = (file, maxMB = 3) => new Promise((res, rej) => {
  if (file.size > maxMB * 1024 * 1024) { rej(new Error(`Max ${maxMB}MB`)); return; }
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = rej;
  r.readAsDataURL(file);
});

// Tag extraction
export const extractTags = t => (t.match(/#[a-zA-Z0-9_]+/g) || []).map(h => h.toLowerCase());

// RBAC helpers
export const hasRole = (profile, ...roles) => roles.includes(profile?.system_role) || profile?.is_admin;
export const isAdmin = p => p?.is_admin || p?.system_role === "admin";
export const canManageAds = p => isAdmin(p) || ["growth_catalyst", "management"].includes(p?.system_role);