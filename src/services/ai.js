// src/services/ai.js

// AI Service — proxies through /api/ai so the key never reaches the browser
export const callAI = async prompt => {
  try {
    const r = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!r.ok) return "AI unavailable.";
    const d = await r.json();
    return d.text || "No response.";
  } catch {
    return "AI unavailable.";
  }
};
