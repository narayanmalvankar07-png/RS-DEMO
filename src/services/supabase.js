// src/services/supabase.js
import { SB_URL, SB_KEY, H } from '../config/constants.js';

// Get auth headers, injecting the user's JWT if available
const authH = (extra = {}) => {
  try {
    const sess = JSON.parse(localStorage.getItem("rs_session") || "null");
    if (sess?.access_token) {
      return { ...H, Authorization: `Bearer ${sess.access_token}`, ...extra };
    }
  } catch {}
  return { ...H, ...extra };
};

// Supabase Auth
export const sbAuth = {
  signUp: (email, password, name) =>
    fetch(`${SB_URL}/auth/v1/signup`, { method: "POST", headers: H, body: JSON.stringify({ email, password, data: { name } }) }).then(r => r.json()),
  signIn: (email, password) =>
    fetch(`${SB_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: H, body: JSON.stringify({ email, password }) }).then(r => r.json()),
  signOut: token =>
    fetch(`${SB_URL}/auth/v1/logout`, { method: "POST", headers: { ...H, Authorization: `Bearer ${token}` } }),
  getUser: token =>
    fetch(`${SB_URL}/auth/v1/user`, { headers: { ...H, Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
  googleOAuth: () => {
    const redirectTo = window.location.origin;
    sessionStorage.setItem("rs_oauth_pending", "1");
    window.location.href = `${SB_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}&scopes=email%20profile`;
  },
};

// ── Local Caching & Delta Syncing Engine ───────────────────────────
const getCache = (key) => {
  try { return JSON.parse(localStorage.getItem(`rs_cache_${key}`) || "[]"); } catch { return []; }
};
const setCache = (key, data) => {
  try { localStorage.setItem(`rs_cache_${key}`, JSON.stringify(data)); } catch {}
};

const CACHED_TABLES = ["rs_posts", "rs_comments", "rs_post_likes", "rs_user_profiles"];

const applyQuery = (data, q) => {
  let result = [...data];
  if (!q) return result;

  // Filter: id=eq.X
  const idMatch = q.match(/id=eq\.([^&]+)/);
  if (idMatch) {
    result = result.filter(x => x.id === idMatch[1]);
  }

  // Filter: uid=eq.X
  const uidMatch = q.match(/uid=eq\.([^&]+)/);
  if (uidMatch) {
    result = result.filter(x => x.uid === uidMatch[1]);
  }

  // Filter: email=eq.X
  const emailMatch = q.match(/email=eq\.([^&]+)/);
  if (emailMatch) {
    result = result.filter(x => x.email === emailMatch[1]);
  }

  // Sort
  if (q.includes("order=created_at.desc")) {
    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else if (q.includes("order=created_at.asc")) {
    result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  // Limit
  const limitMatch = q.match(/limit=(\d+)/);
  if (limitMatch) {
    const lim = parseInt(limitMatch[1], 10);
    result = result.slice(0, lim);
  }

  return result;
};

// Supabase DB
export const db = {
  get: async (t, q = "") => {
    if (CACHED_TABLES.includes(t)) {
      const local = getCache(t);
      
      // Find latest timestamp in cache
      const latest = local.reduce((max, item) => {
        const ts = item.created_at || item.updated_at || "";
        return ts > max ? ts : max;
      }, "");

      // Execute Delta Fetch: only fetch newer items since latest
      let deltaQuery = q;
      if (latest) {
        let cleanQ = q.replace(/order=[^&]+&?/, "").replace(/limit=\d+&?/, "").replace(/&&+/g, "&").replace(/^&|&$/g, "");
        deltaQuery = (cleanQ ? cleanQ + "&" : "") + `created_at=gt.${latest}`;
      }

      try {
        const r = await fetch(`${SB_URL}/rest/v1/${t}${deltaQuery ? "?" + deltaQuery : ""}`, { headers: authH() });
        const fresh = r.ok ? await r.json() : [];
        
        let merged = [...local];
        if (fresh?.length) {
          const mergedMap = new Map(local.map(item => [item.id || `${item.post_id}_${item.uid}`, item]));
          fresh.forEach(item => {
            const key = item.id || `${item.post_id}_${item.uid}`;
            mergedMap.set(key, item);
          });
          merged = Array.from(mergedMap.values());
          setCache(t, merged);
        }
        
        return applyQuery(merged, q);
      } catch {
        return applyQuery(local, q);
      }
    }

    try {
      const r = await fetch(`${SB_URL}/rest/v1/${t}${q ? "?" + q : ""}`, { headers: authH() });
      return r.ok ? r.json() : [];
    } catch { return []; }
  },
  post: async (t, body) => {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/${t}`, { method: "POST", headers: authH({ Prefer: "return=representation" }), body: JSON.stringify(body) });
      if (!r.ok) {
        const errText = await r.text().catch(() => r.status);
        console.error(`Supabase Error [POST ${t}] status=${r.status}:`, errText);
        return null;
      }
      const d = await r.json();
      const saved = Array.isArray(d) ? d[0] : d;

      // Update Cache
      if (CACHED_TABLES.includes(t) && saved) {
        const local = getCache(t);
        local.push(saved);
        setCache(t, local);
      }
      return saved;
    } catch (e) {
      console.error(`Supabase Error [POST ${t}]:`, e.message);
      return null;
    }
  },
  postMany: async (t, rows) => {
    if (!rows?.length) return [];
    try {
      const r = await fetch(`${SB_URL}/rest/v1/${t}`, { method: "POST", headers: authH({ Prefer: "return=representation" }), body: JSON.stringify(rows) });
      if (!r.ok) return [];
      const saved = await r.json();

      // Update Cache
      if (CACHED_TABLES.includes(t) && saved?.length) {
        const local = getCache(t);
        const merged = [...local, ...saved];
        setCache(t, merged);
      }
      return saved;
    } catch { return []; }
  },
  patch: async (t, q, body) => {
    try { 
      await fetch(`${SB_URL}/rest/v1/${t}?${q}`, { method: "PATCH", headers: authH(), body: JSON.stringify(body) });
      
      // Update Cache
      if (CACHED_TABLES.includes(t)) {
        const local = getCache(t);
        const idMatch = q.match(/id=eq\.([^&]+)/);
        if (idMatch) {
          const targetId = idMatch[1];
          const updated = local.map(item => {
            if (item.id === targetId) {
              return { ...item, ...body, updated_at: new Date().toISOString() };
            }
            return item;
          });
          setCache(t, updated);
        }
      }
    } catch {}
  },
  del: async (t, q) => {
    try { 
      await fetch(`${SB_URL}/rest/v1/${t}?${q}`, { method: "DELETE", headers: authH() });
      
      // Update Cache
      if (CACHED_TABLES.includes(t)) {
        const local = getCache(t);
        let filtered = local;
        const idMatch = q.match(/id=eq\.([^&]+)/);
        if (idMatch) {
          filtered = filtered.filter(x => x.id !== idMatch[1]);
        }
        const postAndUidMatch = q.match(/post_id=eq\.([^&]+)&uid=eq\.([^&]+)/);
        if (postAndUidMatch) {
          const pId = postAndUidMatch[1];
          const uId = postAndUidMatch[2];
          filtered = filtered.filter(x => !(x.post_id === pId && x.uid === uId));
        }
        setCache(t, filtered);
      }
    } catch {}
  },
  upsert: async (t, body) => {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/${t}`, { method: "POST", headers: authH({ Prefer: "resolution=merge-duplicates,return=representation" }), body: JSON.stringify(body) });
      if (!r.ok) return null;
      const d = await r.json();
      const saved = Array.isArray(d) ? d[0] : d;

      // Update Cache
      if (CACHED_TABLES.includes(t) && saved) {
        const local = getCache(t);
        const filtered = local.filter(x => x.id !== saved.id);
        filtered.push(saved);
        setCache(t, filtered);
      }
      return saved;
    } catch { return null; }
  },
};