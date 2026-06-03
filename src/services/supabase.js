// src/services/supabase.js
import { SB_URL, SB_KEY, H } from '../config/constants.js';

// Get auth headers, injecting the user's JWT if available
const authH = (extra = {}) => {
  try {
    const sess = JSON.parse(localStorage.getItem("rs_session") || "null");
    if (sess?.access_token) {
      return { ...H, Authorization: `Bearer ${sess.access_token}`, ...extra };
    }
  } catch { }
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
    let redirectTo = window.location.origin;
    if (!window.location.hostname.includes("rightsignal.social")) {
      redirectTo = `https://www.rightsignal.social/?origin=${encodeURIComponent(window.location.origin)}`;
    }
    sessionStorage.setItem("rs_oauth_pending", "1");
    window.location.href = `${SB_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}&scopes=email%20profile`;
  },
  refreshSession: (refreshToken) =>
    fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: H,
      body: JSON.stringify({ refresh_token: refreshToken }),
    }).then(r => r.ok ? r.json() : null),
};

// ── Local Caching & Delta Syncing Engine ───────────────────────────
const getCache = (key) => {
  try { return JSON.parse(localStorage.getItem(`rs_cache_${key}`) || "[]"); } catch { return []; }
};
const setCache = (key, data) => {
  try {
    let toSave = data;
    if (Array.isArray(data) && data.length > 300) {
      toSave = [...data].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 300);
    }
    localStorage.setItem(`rs_cache_${key}`, JSON.stringify(toSave));
  } catch (e) {
    if (e.name === 'QuotaExceededError' && Array.isArray(data)) {
      try {
        const ultraTrim = [...data].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 50);
        localStorage.setItem(`rs_cache_${key}`, JSON.stringify(ultraTrim));
      } catch (e2) {}
    }
  }
};

const parseNotifications = (rows) => {
  if (!rows) return rows;
  const isArray = Array.isArray(rows);
  const list = isArray ? rows : [rows];

  const processed = list.map(row => {
    if (!row || typeof row !== "object" || !row.msg) return row;
    const msgStr = String(row.msg).trim();
    if (msgStr.startsWith("{") && msgStr.endsWith("}")) {
      try {
        const parsed = JSON.parse(msgStr);
        if (parsed && typeof parsed === "object") {
          const newRow = { ...row, ...parsed };
          if (parsed.text !== undefined) {
            newRow.msg = parsed.text;
          }
          return newRow;
        }
      } catch (e) {
        // Keep row as is
      }
    }
    return row;
  });

  return isArray ? processed : processed[0];
};

const normalizeInsertBody = (table, body) => {
  if (table !== "rs_notifications" || !body || typeof body !== "object") return body;
  const normalized = { ...body };

  if (normalized.profile_id && !normalized.requester_uid) {
    normalized.requester_uid = normalized.profile_id;
  }

  const standardFields = ["id", "uid", "type", "msg", "read", "created_at"];
  const extraFields = {};
  let hasExtra = false;

  for (const key of Object.keys(normalized)) {
    if (!standardFields.includes(key)) {
      extraFields[key] = normalized[key];
      delete normalized[key];
      hasExtra = true;
    }
  }

  if (hasExtra) {
    extraFields.text = normalized.msg || "";
    normalized.msg = JSON.stringify(extraFields);
  }

  return normalized;
};

const CACHED_TABLES = ["rs_posts", "rs_comments", "rs_post_likes", "rs_user_profiles"];

const parseQueryParams = (q) => {
  const result = {};
  if (!q) return result;
  const parts = q.split("&");
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx);
    const valExpr = part.slice(eqIdx + 1);
    if (valExpr.startsWith("eq.")) {
      result[key] = valExpr.slice(3);
    } else {
      result[key] = valExpr;
    }
  }
  return result;
};

const applyQuery = (data, q) => {
  let result = [...data];
  if (!q) return result;

  const filters = parseQueryParams(q);

  if (filters.id !== undefined) {
    result = result.filter(x => String(x.id) === filters.id);
  }
  if (filters.uid !== undefined) {
    result = result.filter(x => String(x.uid) === filters.uid);
  }
  if (filters.email !== undefined) {
    result = result.filter(x => String(x.email) === filters.email);
  }
  if (filters.ref_code !== undefined) {
    result = result.filter(x => String(x.ref_code) === filters.ref_code);
  }
  if (filters.reposted_by !== undefined) {
    result = result.filter(x => String(x.reposted_by) === filters.reposted_by);
  }
  if (filters.post_id !== undefined) {
    result = result.filter(x => String(x.post_id) === filters.post_id);
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

// ── Anti-Spam Cache / Rate Limiter for Free Tier ────────────────────
const lastFetchTime = {};
const TTL_MS = 10000; // 10 seconds

// Supabase DB
export const db = {
  get: async (t, q = "") => {
    const fetchKey = `${t}_${q}`;
    const now = Date.now();
    const isCachedTable = CACHED_TABLES.includes(t);
    const local = getCache(t);

    // Free Tier Protection: Skip network if fetched very recently (10s)
    if (isCachedTable && lastFetchTime[fetchKey] && (now - lastFetchTime[fetchKey] < TTL_MS)) {
      console.log(`[Cache TTL hit] Skipping network for ${t}`);
      return applyQuery(local, q);
    }
    lastFetchTime[fetchKey] = now;

    if (isCachedTable) {
      try {
        const r = await fetch(`${SB_URL}/rest/v1/${t}${q ? "?" + q : ""}`, { headers: authH() });
        const fresh = r.ok ? await r.json() : [];
        if (fresh) {
          const filters = parseQueryParams(q);
          const SYSTEM_PARAMS = ["order", "limit", "select"];
          const filterKeys = Object.keys(filters).filter(k => !SYSTEM_PARAMS.includes(k));
          if (filterKeys.length === 0) {
            setCache(t, fresh);
          } else {
            const local = getCache(t);
            // Remove existing items that match the filters of the query
            let updated = local.filter(item => {
              for (const key of filterKeys) {
                const val = filters[key];
                if (item[key] !== undefined && String(item[key]) === val) {
                  continue;
                }
                return true; // Keep
              }
              return false; // Remove
            });
            // Append fresh items
            updated = [...updated, ...fresh];
            setCache(t, updated);
          }
        }
        return applyQuery(fresh, q);
      } catch {
        return applyQuery(local, q);
      }
    }

    try {
      const r = await fetch(`${SB_URL}/rest/v1/${t}${q ? "?" + q : ""}`, { headers: authH() });
      const data = r.ok ? await r.json() : [];
      return t === "rs_notifications" ? parseNotifications(data) : data;
    } catch { return []; }
  },
  post: async (t, body) => {
    try {
      const payload = normalizeInsertBody(t, body);
      const r = await fetch(`${SB_URL}/rest/v1/${t}`, { method: "POST", headers: authH({ Prefer: "return=representation" }), body: JSON.stringify(payload) });
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
      return t === "rs_notifications" ? parseNotifications(saved) : saved;
    } catch (e) {
      console.error(`Supabase Error [POST ${t}]:`, e.message);
      return null;
    }
  },
  postMany: async (t, rows) => {
    if (!rows?.length) return [];
    try {
      const payload = rows.map(row => normalizeInsertBody(t, row));
      const r = await fetch(`${SB_URL}/rest/v1/${t}`, { method: "POST", headers: authH({ Prefer: "return=representation" }), body: JSON.stringify(payload) });
      if (!r.ok) return [];
      const saved = await r.json();

      // Update Cache
      if (CACHED_TABLES.includes(t) && saved?.length) {
        const local = getCache(t);
        const merged = [...local, ...saved];
        setCache(t, merged);
      }
      return t === "rs_notifications" ? parseNotifications(saved) : saved;
    } catch { return []; }
  },
  patch: async (t, q, body) => {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/${t}?${q}`, { method: "PATCH", headers: authH(), body: JSON.stringify(body) });
      if (!r.ok) {
        const errText = await r.text().catch(() => r.status);
        console.error(`Supabase Error [PATCH ${t}] status=${r.status}:`, errText);
        return;
      }

      // Update Cache
      if (CACHED_TABLES.includes(t)) {
        const local = getCache(t);
        const filters = parseQueryParams(q);
        if (filters.id !== undefined) {
          const targetId = filters.id;
          const updated = local.map(item => {
            if (item.id === targetId) {
              return { ...item, ...body, updated_at: new Date().toISOString() };
            }
            return item;
          });
          setCache(t, updated);
        }
      }
    } catch (e) {
      console.error(`Supabase Error [PATCH Exception ${t}]:`, e.message);
    }
  },
  del: async (t, q) => {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/${t}?${q}`, { method: "DELETE", headers: authH() });
      if (!r.ok) {
        const errText = await r.text().catch(() => r.status);
        console.error(`Supabase Error [DELETE ${t}] status=${r.status}:`, errText);
        return;
      }

      // Update Cache
      if (CACHED_TABLES.includes(t)) {
        const local = getCache(t);
        const filters = parseQueryParams(q);
        let filtered = local;
        if (filters.id !== undefined) {
          filtered = filtered.filter(x => x.id !== filters.id);
        } else if (filters.original_post_id !== undefined && filters.reposted_by !== undefined) {
          filtered = filtered.filter(x => !(x.original_post_id === filters.original_post_id && x.reposted_by === filters.reposted_by));
        }
        if (filters.post_id !== undefined && filters.uid !== undefined) {
          filtered = filtered.filter(x => !(x.post_id === filters.post_id && x.uid === filters.uid));
        }
        setCache(t, filtered);
      }
    } catch (e) {
      console.error(`Supabase Error [DELETE Exception ${t}]:`, e.message);
    }
  },
  upsert: async (t, body) => {
    try {
      const payload = normalizeInsertBody(t, body);
      const r = await fetch(`${SB_URL}/rest/v1/${t}`, { method: "POST", headers: authH({ Prefer: "resolution=merge-duplicates,return=representation" }), body: JSON.stringify(payload) });
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
      return t === "rs_notifications" ? parseNotifications(saved) : saved;
    } catch { return null; }
  },
};