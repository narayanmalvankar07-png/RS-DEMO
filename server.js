import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { createServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors());
app.use("/api/upload-audio", express.raw({ type: "audio/*", limit: "10mb" }));
app.use("/api/upload-attachment", express.raw({ type: "*/*", limit: "10mb" }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ── Anthropic client ────────────────────────────────────────────────
const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

// ── Supabase client ─────────────────────────────────────────────────
// Pass ws as transport so Supabase realtime works on Node.js 20
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  supabaseKey,
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

    const { data: messages, error: mErr } = await supabase
      .from("rs_conversation_messages")
      .select("conversation_id, content, created_at, user_id")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false });

    if (mErr) throw mErr;

    const latestByConversation = new Map();
    for (const message of messages || []) {
      if (!latestByConversation.has(message.conversation_id)) {
        latestByConversation.set(message.conversation_id, message);
      }
    }

    const enrichedConversations = (conversations || []).map((conversation) => {
      const latest = latestByConversation.get(conversation.id);
      return {
        ...conversation,
        last_message: latest?.content || null,
        last_message_at: latest?.created_at || null,
        last_message_user_id: latest?.user_id || null,
      };
    });

    res.json(enrichedConversations);
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

// ── DELETE /api/conversations/:conversationId ───────────────────────
// Deletes a conversation and all its participants/messages (soft delete or hard delete)
app.delete("/api/conversations/:conversationId", async (req, res) => {
  const userId = getUser(req);
  if (!userId) return res.status(401).json({ error: "x-user-id header required" });

  const conversationId = req.params.conversationId;

  try {
    // Check if user is a participant
    const { data: participant, error: pErr } = await supabase
      .from("rs_conversation_participants")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .single();

    if (pErr || !participant) {
      return res.status(403).json({ error: "Not a participant in this conversation" });
    }

    // Delete all messages first (foreign key constraint)
    const { error: msgErr } = await supabase
      .from("rs_conversation_messages")
      .delete()
      .eq("conversation_id", conversationId);

    if (msgErr) throw msgErr;

    // Delete all participants
    const { error: partErr } = await supabase
      .from("rs_conversation_participants")
      .delete()
      .eq("conversation_id", conversationId);

    if (partErr) throw partErr;

    // Delete the conversation itself
    const { error: convErr } = await supabase
      .from("rs_conversations")
      .delete()
      .eq("id", conversationId);

    if (convErr) throw convErr;

    res.json({ success: true, message: "Conversation deleted" });
  } catch (err) {
    console.error("DELETE /api/conversations/:conversationId error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/upload-audio ──────────────────────────────────────────
// Uploads raw audio binary to Supabase Storage and returns public URL
app.post("/api/upload-audio", async (req, res) => {
  const userId = getUser(req);
  if (!userId) return res.status(401).json({ error: "x-user-id header required" });

  const fileName = req.headers['x-file-name'] || `recording-${Date.now()}.webm`;
  
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.VITE_SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: "Server missing SUPABASE_SERVICE_ROLE_KEY for storage upload" });
    }

    // req.body contains raw binary because express.raw is bound on this route
    const buffer = req.body;
    
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      return res.status(400).json({ error: "No audio data received" });
    }

    console.log(`[Upload] Uploading audio: ${fileName}, size: ${buffer.length} bytes`);

    // Upload to Supabase Storage in "audio" bucket
    const path = `${userId}/${Date.now()}-${fileName}`;
    const { error: uploadErr } = await supabase
      .storage
      .from('audio')
      .upload(path, buffer, { contentType: 'audio/webm', upsert: false });

    if (uploadErr) {
      console.error(`[Upload] Error uploading to Supabase:`, uploadErr);
      throw uploadErr;
    }

    console.log(`[Upload] Uploaded successfully: ${path}`);

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('audio')
      .getPublicUrl(path);

    const publicUrl = urlData?.publicUrl;
    console.log(`[Upload] Public URL: ${publicUrl}`);
    res.json({ url: publicUrl, path });
  } catch (err) {
    console.error("POST /api/upload-audio error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/upload-attachment ─────────────────────────────────────
// Uploads image/PDF attachments to Supabase Storage under the user folder.
app.post("/api/upload-attachment", async (req, res) => {
  const userId = getUser(req);
  if (!userId) return res.status(401).json({ error: "x-user-id header required" });

  const fileName = req.headers["x-file-name"] || `attachment-${Date.now()}`;
  const contentType = req.headers["content-type"] || "application/octet-stream";

  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.VITE_SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: "Server missing SUPABASE_SERVICE_ROLE_KEY for storage upload" });
    }

    const buffer = req.body;

    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      return res.status(400).json({ error: "No attachment data received" });
    }

    console.log(`[Upload] Uploading attachment: ${fileName}, type: ${contentType}, size: ${buffer.length} bytes`);

    const path = `${userId}/attachments/${Date.now()}-${fileName}`;
    const { error: uploadErr } = await supabase
      .storage
      .from('audio')
      .upload(path, buffer, { contentType, upsert: false });

    if (uploadErr) {
      console.error(`[Upload] Error uploading attachment to Supabase:`, uploadErr);
      throw uploadErr;
    }

    const { data: urlData } = supabase
      .storage
      .from('audio')
      .getPublicUrl(path);

    res.json({ url: urlData?.publicUrl, path, contentType });
  } catch (err) {
    console.error("POST /api/upload-attachment error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Start server with WebSocket integration ─────────────────────────
const PORT = process.env.API_PORT || 10000;
const server = createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Map();
const lastSentTimes = new Map();
const messageQueue = [];

// Background loop to batch-write messages to Supabase every 3 seconds
setInterval(async () => {
  if (messageQueue.length === 0) return;

  const batch = [...messageQueue];
  messageQueue.length = 0; // Clear queue immediately to prevent race conditions

  console.log(`[WS] Flushing batch of ${batch.length} messages to Supabase...`);
  try {
    const { error } = await supabase
      .from("rs_conversation_messages")
      .insert(batch.map(m => ({
        id: m.id,
        conversation_id: m.conversation_id,
        user_id: m.user_id,
        content: m.content,
        created_at: m.created_at
      })));

    if (error) {
      console.error("[WS] Batch insert error:", error.message);
      // Put back in queue to retry
      messageQueue.push(...batch);
    } else {
      console.log(`[WS] Successfully flushed ${batch.length} messages to Supabase.`);
    }
  } catch (err) {
    console.error("[WS] Exception during batch insert:", err.message);
    messageQueue.push(...batch);
  }
}, 3000);

wss.on("connection", (ws) => {
  let myUserId = null;

  ws.on("error", (err) => {
    console.error(`[WS] Socket error for user ${myUserId || "unknown"}:`, err.message);
  });

  ws.on("message", (messageStr) => {
    try {
      const msg = JSON.parse(messageStr);
      if (msg.type === "auth") {
        myUserId = msg.userId;
        if (!clients.has(myUserId)) {
          clients.set(myUserId, new Set());
        }
        clients.get(myUserId).add(ws);
        console.log(`[WS] User ${myUserId} connected`);
      } else if (msg.type === "send_message") {
        // 1. Rate Limiting Check (max 1 message per 400ms per user)
        const now = Date.now();
        const lastSent = lastSentTimes.get(myUserId) || 0;
        if (now - lastSent < 400) {
          ws.send(JSON.stringify({ type: "error", message: "Rate limit exceeded. Please slow down!" }));
          return;
        }
        lastSentTimes.set(myUserId, now);

        const { message, participants } = msg;

        // 2. Broadcast the message in-memory immediately to all participants
        if (participants && Array.isArray(participants)) {
          participants.forEach((uid) => {
            const userSockets = clients.get(uid);
            if (userSockets) {
              userSockets.forEach((s) => {
                if (s.readyState === WebSocket.OPEN) {
                  s.send(JSON.stringify({ type: "message", message }));
                }
              });
            }
          });
        }

        // 3. Queue the write payload
        messageQueue.push({
          id: message.id,
          conversation_id: message.conversation_id,
          user_id: message.user_id,
          content: message.content,
          created_at: message.created_at
        });

      } else if (msg.type === "typing") {
        // Relay typing indicators in-memory to other active participants
        const { conversationId, targetUserId, isTyping } = msg;
        const targetSockets = clients.get(targetUserId);
        if (targetSockets) {
          targetSockets.forEach((s) => {
            if (s.readyState === WebSocket.OPEN) {
              s.send(JSON.stringify({ type: "typing", conversationId, userId: myUserId, isTyping }));
            }
          });
        }
      }
    } catch (err) {
      console.error("[WS] Error handling message:", err.message);
    }
  });

  ws.on("close", () => {
    if (myUserId && clients.has(myUserId)) {
      clients.get(myUserId).delete(ws);
      if (clients.get(myUserId).size === 0) {
        clients.delete(myUserId);
        lastSentTimes.delete(myUserId);
      }
      console.log(`[WS] User ${myUserId} disconnected`);
    }
  });
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`API server running on port ${PORT}`);
});
