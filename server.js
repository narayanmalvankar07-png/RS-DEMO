import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { WebSocket } from "ws";

const app = express();
app.use(cors());
app.use(express.json());

// ── Anthropic client ────────────────────────────────────────────────
const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

// ── Supabase client ─────────────────────────────────────────────────
// Pass ws as transport so Supabase realtime works on Node.js 20
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
  { realtime: { transport: WebSocket } }
);

// ── Helper: get calling user from header ────────────────────────────
const getUser = (req) => req.headers["x-user-id"] || null;

// ── AI endpoint ─────────────────────────────────────────────────────
app.post("/api/ai", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt required" });
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content?.[0]?.text || "No response.";
    res.json({ text });
  } catch (err) {
    console.error("AI error:", err.message);
    res.status(500).json({ text: "AI unavailable." });
  }
});

// ── GET /api/conversations ──────────────────────────────────────────
// Returns all conversations where the calling user is a participant.
app.get("/api/conversations", async (req, res) => {
  const userId = getUser(req);
  if (!userId) return res.status(401).json({ error: "x-user-id header required" });

  try {
    // Get conversation IDs the user belongs to
    const { data: participantRows, error: pErr } = await supabase
      .from("rs_conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    if (pErr) throw pErr;
    if (!participantRows?.length) return res.json([]);

    const convIds = participantRows.map((r) => r.conversation_id);

    // Fetch those conversations with all their participants
    const { data: conversations, error: cErr } = await supabase
      .from("rs_conversations")
      .select("*, rs_conversation_participants(user_id)")
      .in("id", convIds)
      .order("updated_at", { ascending: false });

    if (cErr) throw cErr;
    res.json(conversations || []);
  } catch (err) {
    console.error("GET /api/conversations error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/conversations ─────────────────────────────────────────
// Creates a new 1-on-1 or group conversation.
// Body: { targetUserId } for 1-on-1  |  { participants: string[], name: string } for group
app.post("/api/conversations", async (req, res) => {
  const userId = getUser(req);
  if (!userId) return res.status(401).json({ error: "x-user-id header required" });

  const { targetUserId, participants, name } = req.body;

  try {
    const isGroup = !!participants;
    const memberIds = isGroup
      ? [...new Set([userId, ...participants])]
      : [userId, targetUserId];

    if (!isGroup && !targetUserId) {
      return res.status(400).json({ error: "targetUserId required for 1-on-1 conversations" });
    }

    // Create the conversation row
    const { data: conv, error: cErr } = await supabase
      .from("rs_conversations")
      .insert({ name: name || null, is_group: isGroup, created_by: userId })
      .select()
      .single();

    if (cErr) throw cErr;

    // Add all participants
    const participantRows = memberIds.map((uid) => ({
      conversation_id: conv.id,
      user_id: uid,
    }));

    const { error: pErr } = await supabase
      .from("rs_conversation_participants")
      .insert(participantRows);

    if (pErr) throw pErr;

    res.status(201).json(conv);
  } catch (err) {
    console.error("POST /api/conversations error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/conversations/with/:userId ────────────────────────────
// Checks if a 1-on-1 conversation already exists between the current
// user (x-user-id) and the :userId param. Returns the conversation or null.
app.get("/api/conversations/with/:userId", async (req, res) => {
  const meId = getUser(req);
  if (!meId) return res.status(401).json({ error: "x-user-id header required" });

  const otherId = req.params.userId;

  try {
    // Find conversation IDs for both users independently
    const [{ data: myConvs }, { data: theirConvs }] = await Promise.all([
      supabase
        .from("rs_conversation_participants")
        .select("conversation_id")
        .eq("user_id", meId),
      supabase
        .from("rs_conversation_participants")
        .select("conversation_id")
        .eq("user_id", otherId),
    ]);

    const myIds = new Set((myConvs || []).map((r) => r.conversation_id));
    const shared = (theirConvs || [])
      .map((r) => r.conversation_id)
      .filter((id) => myIds.has(id));

    if (!shared.length) return res.json(null);

    // Among shared conversations, find the 1-on-1 (is_group = false)
    const { data: conversations, error } = await supabase
      .from("rs_conversations")
      .select("*, rs_conversation_participants(user_id)")
      .in("id", shared)
      .eq("is_group", false);

    if (error) throw error;

    // A true 1-on-1 has exactly 2 participants
    const oneOnOne = (conversations || []).find(
      (c) => c.rs_conversation_participants?.length === 2
    );

    res.json(oneOnOne || null);
  } catch (err) {
    console.error("GET /api/conversations/with/:userId error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Start server ────────────────────────────────────────────────────
const PORT = process.env.API_PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API server running on port ${PORT}`);
});
