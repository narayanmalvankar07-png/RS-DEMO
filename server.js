import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { createServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import crypto from "crypto";
import fs from "fs";

// Safely load .env locally without crashing if file does not exist in production
if (fs.existsSync(".env")) {
  try {
    const envLines = fs.readFileSync(".env", "utf8").split(/\r?\n/);
    for (const line of envLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch (e) {
    console.warn("Could not parse local .env file:", e.message);
  }
}

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

// ── Resend client ───────────────────────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key_for_testing");

// ── Supabase client ─────────────────────────────────────────────────
// Pass ws as transport so Supabase realtime works on Node.js 20
const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

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



// ── Password Reset & Management Maps ────────────────────────────────
const resetTokens = new Map(); // token -> { email, expiresAt }
const rateLimitMap = new Map(); // email -> lastRequestTime

// Rate limit helper
const checkRateLimit = (email) => {
  const lastRequest = rateLimitMap.get(email);
  if (lastRequest && Date.now() - lastRequest < 60000) {
    return false;
  }
  rateLimitMap.set(email, Date.now());
  return true;
};

// Password policy validator
const validatePasswordPolicy = (pwd) => {
  if (pwd.length < 8) return "Password must be at least 8 characters long.";
  if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(pwd)) return "Password must contain at least one lowercase letter.";
  if (!/[0-9]/.test(pwd)) return "Password must contain at least one number.";
  if (!/[^A-Za-z0-9]/.test(pwd)) return "Password must contain at least one special character.";
  return null;
};

// ── POST /api/auth/forgot-password ──────────────────────────────────
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!checkRateLimit(normalizedEmail)) {
    return res.status(429).json({ error: "Password reset request rate limit exceeded. Please wait 60 seconds." });
  }

  try {
    // 1. Verify user exists in rs_user_profiles
    const { data: profile, error: profileErr } = await supabase
      .from("rs_user_profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profileErr) {
      console.error("Forgot password query error:", profileErr);
    }

    // Standard security: return success even if user not found to prevent enumeration
    if (!profile) {
      console.log(`[Forgot Password] User not found: ${normalizedEmail}`);
      return res.status(200).json({ msg: "Password reset email sent successfully." });
    }

    // 2. Generate a secure reset token
    const token = crypto.randomUUID();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins expiry

    // 3. Clear any existing tokens for this email
    for (const [t, d] of resetTokens.entries()) {
      if (d.email === normalizedEmail) {
        resetTokens.delete(t);
      }
    }

    // 4. Save token
    resetTokens.set(token, { email: normalizedEmail, expiresAt });

    // 5. Build reset URL
    const origin = req.headers.origin || "http://localhost:5173";
    const resetLink = `${origin}/?reset-token=${token}`;

    console.log("=========================================");
    console.log(`PASSWORD RESET LINK FOR ${normalizedEmail}:`);
    console.log(resetLink);
    console.log("=========================================");

    // 6. Send recovery email via Resend
    try {
      await resend.emails.send({
        from: "RightSignal Auth <onboarding@resend.dev>",
        to: normalizedEmail,
        subject: "Reset your RightSignal Password",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #4f46e5; margin-top: 0;">Reset your Password</h2>
            <p>You requested to reset your password on RightSignal.</p>
            <p>Please click the button below to set a new password. This link is single-use and will expire in 15 minutes.</p>
            <div style="margin: 24px 0;">
              <a href="${resetLink}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">If you did not request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">RightSignal Platform</p>
          </div>
        `
      });
    } catch (emailErr) {
      console.error("Resend delivery failed:", emailErr.message);
    }

    return res.status(200).json({ msg: "Password reset email sent successfully." });
  } catch (err) {
    console.error("Forgot password system exception:", err.message);
    return res.status(500).json({ error: "Failed to process forgot password request." });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────────────
app.post("/api/auth/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: "Token and password are required." });
  }

  // 1. Verify token
  const tokenData = resetTokens.get(token);
  if (!tokenData) {
    return res.status(400).json({ error: "Invalid or expired reset link." });
  }

  if (Date.now() > tokenData.expiresAt) {
    resetTokens.delete(token);
    return res.status(400).json({ error: "Invalid or expired reset link." });
  }

  // 2. Validate password policy
  const policyErr = validatePasswordPolicy(password);
  if (policyErr) {
    return res.status(400).json({ error: policyErr });
  }

  try {
    // 3. Find user profile by email
    const { data: profile, error: profileErr } = await supabase
      .from("rs_user_profiles")
      .select("id")
      .eq("email", tokenData.email)
      .maybeSingle();

    if (profileErr || !profile) {
      return res.status(400).json({ error: "User profile not found." });
    }

    // 4. Update the password in Supabase Auth
    const { error: updateErr } = await supabase.auth.admin.updateUserById(profile.id, { password });
    if (updateErr) {
      console.error("Supabase password update error:", updateErr);
      return res.status(400).json({ error: updateErr.message });
    }

    // 5. Invalidate the used token and all other tokens for this email
    for (const [t, d] of resetTokens.entries()) {
      if (d.email === tokenData.email) {
        resetTokens.delete(t);
      }
    }

    return res.status(200).json({ msg: "Password reset completed successfully." });
  } catch (err) {
    console.error("Reset password exception:", err.message);
    return res.status(500).json({ error: "Failed to reset password." });
  }
});

// ── POST /api/auth/change-password ───────────────────────────────────
app.post("/api/auth/change-password", async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current password and new password are required." });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header." });
  }
  const token = authHeader.split(" ")[1];

  try {
    // 1. Authenticate calling user using their JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: "Unauthorized session." });
    }

    // 2. Verify current password by making a request to Supabase Token API
    const verifyRes = await fetch(`${process.env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "apikey": process.env.VITE_SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email: user.email, password: currentPassword })
    });

    if (!verifyRes.ok) {
      return res.status(400).json({ error: "Current password is incorrect." });
    }

    // 3. Prevent reusing current password
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: "New password cannot be the same as your current password." });
    }

    // 4. Validate password policy
    const policyErr = validatePasswordPolicy(newPassword);
    if (policyErr) {
      return res.status(400).json({ error: policyErr });
    }

    // 5. Update user password in Supabase Auth
    const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, { password: newPassword });
    if (updateErr) {
      console.error("Supabase password change error:", updateErr);
      return res.status(400).json({ error: updateErr.message });
    }

    return res.status(200).json({ msg: "Password updated successfully." });
  } catch (err) {
    console.error("Change password exception:", err.message);
    return res.status(500).json({ error: "Failed to update password." });
  }
});

// ── Start server with WebSocket integration ─────────────────────────
const PORT = process.env.PORT || process.env.API_PORT || 10000;
const server = createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Map();
const lastSentTimes = new Map();
const messageQueue = [];
const retryCounts = new Map();
const deadLetterQueue = [];

function handleFailedMessages(batch) {
  const retryLimit = 5;
  batch.forEach(m => {
    const currentRetries = retryCounts.get(m.id) || 0;
    if (currentRetries < retryLimit) {
      retryCounts.set(m.id, currentRetries + 1);
      messageQueue.push(m); // Put back in queue to retry
    } else {
      console.error(`[WS] Message ${m.id} exceeded maximum retry limit (${retryLimit}). Moving to Dead-Letter Queue (DLQ). content="${m.content?.slice(0, 100)}"`);
      deadLetterQueue.push({
        message: m,
        failed_at: new Date().toISOString(),
        retry_count: currentRetries
      });
      retryCounts.delete(m.id);
    }
  });
}

// Background loop to batch-write messages to Supabase every 3 seconds
setInterval(async () => {
  if (messageQueue.length === 0) return;

  // Cap batch size to 100 to prevent massive bulk insert spikes
  const batch = messageQueue.splice(0, 100);

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
      handleFailedMessages(batch);
    } else {
      console.log(`[WS] Successfully flushed ${batch.length} messages to Supabase.`);
      // Clear retry tracking for successful messages
      batch.forEach(m => retryCounts.delete(m.id));
    }
  } catch (err) {
    console.error("[WS] Exception during batch insert:", err.message);
    handleFailedMessages(batch);
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
      } else if (msg.type === "edit_message") {
        const { messageId, conversationId, content, participants } = msg;
        if (participants && Array.isArray(participants)) {
          participants.forEach((uid) => {
            const userSockets = clients.get(uid);
            if (userSockets) {
              userSockets.forEach((s) => {
                if (s.readyState === WebSocket.OPEN) {
                  s.send(JSON.stringify({ type: "edit_message", messageId, conversationId, content }));
                }
              });
            }
          });
        }
      } else if (msg.type === "delete_message") {
        const { messageId, conversationId, participants } = msg;
        if (participants && Array.isArray(participants)) {
          participants.forEach((uid) => {
            const userSockets = clients.get(uid);
            if (userSockets) {
              userSockets.forEach((s) => {
                if (s.readyState === WebSocket.OPEN) {
                  s.send(JSON.stringify({ type: "delete_message", messageId, conversationId }));
                }
              });
            }
          });
        }
      } else if (msg.type === "react_message") {
        const { messageId, conversationId, reactions, participants } = msg;
        if (participants && Array.isArray(participants)) {
          participants.forEach((uid) => {
            const userSockets = clients.get(uid);
            if (userSockets) {
              userSockets.forEach((s) => {
                if (s.readyState === WebSocket.OPEN) {
                  s.send(JSON.stringify({ type: "react_message", messageId, conversationId, reactions }));
                }
              });
            }
          });
        }
      } else if (msg.type === "feed_event") {
        // Broadcast to everyone else
        clients.forEach((userSockets, uid) => {
          if (uid !== myUserId) {
            userSockets.forEach((s) => {
              if (s.readyState === WebSocket.OPEN) {
                s.send(JSON.stringify(msg));
              }
            });
          }
        });
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

// ── Cashfree Payment Integration ────────────────────────────────────
const isProductionEnv = process.env.NODE_ENV === "production" || process.env.RENDER === "true" || process.env.CASHFREE_ENV === "production";

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || (isProductionEnv ? process.env.CASHFREE_PROD_APP_ID : process.env.CASHFREE_TEST_APP_ID) || process.env.CASHFREE_PROD_APP_ID || "";
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || (isProductionEnv ? process.env.CASHFREE_PROD_SECRET_KEY : process.env.CASHFREE_TEST_SECRET_KEY) || process.env.CASHFREE_PROD_SECRET_KEY || "";

const isTestKey = (CASHFREE_SECRET_KEY || "").startsWith("cfsk_ma_test_") || (CASHFREE_APP_ID || "").startsWith("TEST");
const isSandbox = process.env.CASHFREE_ENV === "sandbox" || (!isProductionEnv && isTestKey) || isTestKey;
const CASHFREE_BASE_URL = isSandbox ? "https://sandbox.cashfree.com/pg" : "https://api.cashfree.com/pg";

// ── PayPal Payment Integration ──────────────────────────────────────
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || (isProductionEnv ? process.env.PAYPAL_PROD_CLIENT_ID : process.env.PAYPAL_TEST_CLIENT_ID) || process.env.PAYPAL_PROD_CLIENT_ID || "";
const PAYPAL_SECRET = process.env.PAYPAL_SECRET || (isProductionEnv ? process.env.PAYPAL_PROD_SECRET : process.env.PAYPAL_TEST_SECRET) || process.env.PAYPAL_PROD_SECRET || "";

const isPayPalSandbox = process.env.PAYPAL_ENV === "sandbox" || (PAYPAL_CLIENT_ID || "").startsWith("AfSQ");
const PAYPAL_BASE_URL = isPayPalSandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

async function getPayPalAccessToken() {
  const tryAuth = async (baseUrl, clientId, secret) => {
    if (!clientId || !secret) {
      throw new Error("PayPal Client ID or Secret is missing in environment variables.");
    }
    const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error_description || data.message || "Failed to authenticate with PayPal");
    }
    return { token: data.access_token, baseUrl };
  };

  try {
    return await tryAuth(PAYPAL_BASE_URL, PAYPAL_CLIENT_ID, PAYPAL_SECRET);
  } catch (err1) {
    console.warn(`[PayPal Auth Warning] Primary (${PAYPAL_BASE_URL}) failed: ${err1.message}. Attempting fallback endpoint...`);
    const altBaseUrl = PAYPAL_BASE_URL.includes("sandbox") ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
    try {
      return await tryAuth(altBaseUrl, PAYPAL_CLIENT_ID, PAYPAL_SECRET);
    } catch (err2) {
      const testClientId = process.env.PAYPAL_TEST_CLIENT_ID;
      const testSecret = process.env.PAYPAL_TEST_SECRET;
      if (testClientId && testSecret) {
        try {
          return await tryAuth("https://api-m.sandbox.paypal.com", testClientId, testSecret);
        } catch (err3) {}
      }
      throw err1;
    }
  }
}

app.post("/api/cashfree/create-order", async (req, res) => {
  const userId = getUser(req) || req.body.userId;
  const { planId, customerEmail, customerPhone, customerName, returnUrl, currency } = req.body;

  if (!planId || !["starter", "growth"].includes(planId)) {
    return res.status(400).json({ error: "Invalid or missing planId. Options: starter, growth" });
  }

  const isUSD = String(currency).toUpperCase() === "USD";
  const orderCurrency = isUSD ? "USD" : "INR";

  let amount;
  if (isUSD) {
    amount = planId === "starter" ? 5.99 : 14.99;
  } else {
    amount = planId === "starter" ? 499.00 : 1299.00;
  }

  const orderId = `rs_sub_${planId}_${orderCurrency.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    let finalReturnUrl = returnUrl || `https://www.rightsignal.social/?cf_order_id={order_id}&plan=${planId}`;
    if (!isSandbox && !finalReturnUrl.startsWith("https://")) {
      finalReturnUrl = finalReturnUrl.replace(/^http:\/\//i, "https://");
      if (!finalReturnUrl.startsWith("https://")) {
        finalReturnUrl = `https://${finalReturnUrl}`;
      }
    }

    const priceLabel = isUSD ? `$${amount}` : `₹${amount.toLocaleString()}`;

    const cfResponse = await fetch(`${CASHFREE_BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "x-client-id": CASHFREE_APP_ID,
        "x-client-secret": CASHFREE_SECRET_KEY,
        "x-api-version": "2023-08-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order_amount: amount,
        order_currency: orderCurrency,
        order_id: orderId,
        customer_details: {
          customer_id: (userId || "user_guest").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40),
          customer_name: customerName || "RightSignal Member",
          customer_email: customerEmail || "member@rightsignal.co",
          customer_phone: (customerPhone || "9999999999").replace(/[^0-9]/g, "").slice(-10) || "9999999999",
        },
        order_meta: {
          return_url: finalReturnUrl,
        },
        order_note: `RightSignal ${planId === "starter" ? "Founder Starter" : "Founder Growth"} (${priceLabel})`,
      }),
    });

    const data = await cfResponse.json();

    if (!cfResponse.ok) {
      console.error("[Cashfree] Create Order Error:", data);
      return res.status(cfResponse.status).json({ error: data.message || "Cashfree order creation failed", details: data });
    }

    res.json({
      order_id: data.order_id,
      payment_session_id: data.payment_session_id,
      cf_order_id: data.cf_order_id,
      payment_link: data.payment_link || (data.payments?.url),
      amount,
      currency: orderCurrency,
      planId,
      mode: isSandbox ? "sandbox" : "production",
    });
  } catch (err) {
    console.error("[Cashfree] Express endpoint exception:", err);
    res.status(500).json({ error: "Failed to connect to payment gateway" });
  }
});

app.post("/api/cashfree/verify-payment", async (req, res) => {
  const userId = getUser(req) || req.body.userId;
  const { orderId, planId } = req.body;

  if (!orderId) return res.status(400).json({ error: "orderId required" });

  try {
    const cfResponse = await fetch(`${CASHFREE_BASE_URL}/orders/${orderId}`, {
      headers: {
        "x-client-id": CASHFREE_APP_ID,
        "x-client-secret": CASHFREE_SECRET_KEY,
        "x-api-version": "2023-08-01",
      },
    });

    const orderData = await cfResponse.json();

    console.log(`[Cashfree Verify] Order ID: ${orderId}, Status: ${orderData.order_status}, Amount: ${orderData.order_amount}`);

    // ONLY activate subscription plan if Cashfree order status is strictly PAID!
    if (orderData.order_status === "PAID") {
      const activePlan = planId || (orderData.order_amount >= 1200 || orderData.order_amount >= 14 ? "growth" : "starter");
      // Growth plan grants 3 Months (90 days) bundled access! Starter grants 30 days.
      const durationMs = activePlan === "growth" ? 90 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(Date.now() + durationMs).toISOString();

      if (userId) {
        try {
          const { data: profData } = await supabase.from("rs_user_profiles").select("social_links").eq("id", userId).single();
          const currentSocials = profData?.social_links || {};
          const updatedSocials = {
            ...currentSocials,
            _subscription: { plan: activePlan, status: "active", expires_at: expiresAt }
          };

          const { error: dbErr } = await supabase
            .from("rs_user_profiles")
            .update({
              subscription_plan: activePlan,
              subscription_status: "active",
              subscription_expires_at: expiresAt,
              social_links: updatedSocials,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);

          if (dbErr) {
            console.warn("[verify-payment] Direct column update notice, persisting to social_links JSON fallback:", dbErr.message);
            await supabase
              .from("rs_user_profiles")
              .update({
                social_links: updatedSocials,
                updated_at: new Date().toISOString(),
              })
              .eq("id", userId);
          }
        } catch (e) {
          console.error("[verify-payment] Database update exception:", e);
        }
      }

      return res.json({
        success: true,
        order_status: "PAID",
        plan: activePlan,
        expires_at: expiresAt,
      });
    }

    // Payment not completed, failed, or cancelled/dropped
    return res.json({
      success: false,
      order_status: orderData.order_status || "UNPAID",
      message: `Payment status is ${orderData.order_status || "UNPAID"}. Subscription plan was not activated.`,
    });
  } catch (err) {
    console.error("[Cashfree] Verify Payment Error:", err);
    res.status(500).json({ error: "Failed to verify payment status" });
  }
});


app.post("/api/cashfree/webhook", async (req, res) => {
  try {
    const event = req.body;
    console.log("[Cashfree Webhook Received]", event?.type);
    res.json({ status: "OK" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PayPal Endpoints ────────────────────────────────────────────────
app.get("/api/paypal/config", (req, res) => {
  res.json({
    clientId: PAYPAL_CLIENT_ID,
    mode: isPayPalSandbox ? "sandbox" : "production",
  });
});

app.post("/api/paypal/create-order", async (req, res) => {
  const userId = getUser(req) || req.body.userId;
  const { planId, returnUrl } = req.body;

  if (!planId || !["starter", "growth"].includes(planId)) {
    return res.status(400).json({ error: "Invalid or missing planId. Options: starter, growth" });
  }

  const amount = planId === "starter" ? "5.99" : "14.99";

  try {
    const { token: accessToken, baseUrl: activeBaseUrl } = await getPayPalAccessToken();

    let finalReturnUrl = returnUrl || `https://www.rightsignal.social/?paypal_order_id={order_id}&plan=${planId}`;

    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: amount,
          },
          description: `RightSignal ${planId === "starter" ? "Founder Starter" : "Founder Growth (3-Month Bundle)"} ($${amount})`,
        },
      ],
      application_context: {
        brand_name: "RightSignal Social",
        landing_page: "LOGIN",
        user_action: "PAY_NOW",
        return_url: finalReturnUrl.replace("{order_id}", "PAYPAL_RETURN"),
        cancel_url: finalReturnUrl.replace("{order_id}", "CANCELLED"),
      },
    };

    const ppResponse = await fetch(`${activeBaseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    const data = await ppResponse.json();

    if (!ppResponse.ok) {
      console.error("[PayPal] Create Order Error:", data);
      return res.status(ppResponse.status).json({ error: data.message || "PayPal order creation failed", details: data });
    }

    const approveLink = data.links?.find((l) => l.rel === "approve")?.href;

    res.json({
      id: data.id,
      order_id: data.id,
      payment_link: approveLink,
      approval_url: approveLink,
      amount,
      currency: "USD",
      planId,
      mode: activeBaseUrl.includes("sandbox") ? "sandbox" : "production",
    });
  } catch (err) {
    console.error("[PayPal] Express endpoint exception:", err);
    res.status(500).json({ error: err.message || "Failed to connect to PayPal API" });
  }
});

app.post("/api/paypal/capture-order", async (req, res) => {
  const userId = getUser(req) || req.body.userId;
  const { orderId, planId } = req.body;

  if (!orderId) return res.status(400).json({ error: "orderId required" });

  try {
    const { token: accessToken, baseUrl: activeBaseUrl } = await getPayPalAccessToken();
    const response = await fetch(`${activeBaseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const orderData = await response.json();
    console.log(`[PayPal Capture] Order ID: ${orderId}, Status: ${orderData.status}`);

    if (orderData.status === "COMPLETED") {
      const activePlan = planId || "starter";
      // Growth plan grants 3 Months (90 days) bundled access! Starter grants 30 days.
      const durationMs = activePlan === "growth" ? 90 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(Date.now() + durationMs).toISOString();

      if (userId) {
        try {
          const { data: profData } = await supabase.from("rs_user_profiles").select("social_links").eq("id", userId).single();
          const currentSocials = profData?.social_links || {};
          const updatedSocials = {
            ...currentSocials,
            _subscription: { plan: activePlan, status: "active", expires_at: expiresAt }
          };

          const { error: dbErr } = await supabase
            .from("rs_user_profiles")
            .update({
              subscription_plan: activePlan,
              subscription_status: "active",
              subscription_expires_at: expiresAt,
              social_links: updatedSocials,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);

          if (dbErr) {
            console.warn("[PayPal capture-order] Direct column update notice, persisting to social_links JSON fallback:", dbErr.message);
            await supabase
              .from("rs_user_profiles")
              .update({
                social_links: updatedSocials,
                updated_at: new Date().toISOString(),
              })
              .eq("id", userId);
          }
        } catch (e) {
          console.error("[PayPal capture-order] Database update exception:", e);
        }
      }

      return res.json({
        success: true,
        order_status: "COMPLETED",
        plan: activePlan,
        expires_at: expiresAt,
      });
    }

    return res.json({
      success: false,
      order_status: orderData.status || "UNPAID",
      message: `Payment status is ${orderData.status || "UNPAID"}. Subscription plan was not activated.`,
    });
  } catch (err) {
    console.error("[PayPal] Capture Order Error:", err);
    res.status(500).json({ error: "Failed to verify PayPal payment status" });
  }
});

// ── POST /api/send-application ───────────────────────────────────────
// Sends VC funding application email via Resend
app.post("/api/send-application", async (req, res) => {
  const userId = getUser(req) || req.body.userId;
  const { investorEmail, investorName, formData } = req.body;

  if (!investorEmail || !formData) {
    return res.status(400).json({ error: "investorEmail and formData are required" });
  }

  try {
    const startupName = formData.startupName || formData.startup_name || formData.companyName || formData.company_name || formData.name || "Startup Application";
    const founderName = formData.founderName || "Founder";
    let founderEmail = formData.founderEmail || formData.email || req.body.founderEmail || "";
    
    // Automatically retrieve founder email from DB user profile if not passed in form payload
    if (!founderEmail && userId) {
      try {
        const { data: prof } = await supabase.from("rs_user_profiles").select("email").eq("id", userId).maybeSingle();
        if (prof?.email) founderEmail = prof.email;
      } catch (profErr) {
        console.warn("[Send Application] Could not fetch founder email from DB profile:", profErr.message);
      }
    }

    const founderMobile = formData.founderMobile || formData.mobileNumber || "N/A";
    const mobilePrefix = formData.founderMobilePrefix || formData.countryCode || "";
    const pitchDeck = formData.pitchDeckUrl || "";
    const financialModel = formData.financialModelUrl || "";
    const dataRoom = formData.dataRoomUrl || "";
    const productDemo = formData.demoProductUrl || formData.demoWebsiteUrl || formData.productDemoUrl || "";
    const website = formData.websiteUrl || formData.website || "";
    const targetAmount = formData.amountRaisingNow || formData.targetAmount || "N/A";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RightSignal | Investment Application from ${startupName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px 10px; -webkit-font-smoothing: antialiased; }
          .wrapper { max-width: 800px; width: 100%; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); box-sizing: border-box; }
          .header { background: #111625; padding: 40px 44px; color: #ffffff; width: 100%; box-sizing: border-box; }
          .top-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 8px; }
          .title { font-size: 28px; font-weight: 800; margin: 0 0 6px 0; color: #ffffff; letter-spacing: -0.02em; }
          .subtitle { font-size: 14px; color: #cbd5e1; font-weight: 500; margin: 0; }
          .body { padding: 32px; }
          .pitch-box { background: #f8fafc; border-left: 3px solid #3b82f6; padding: 14px 18px; margin: 0 0 28px 0; font-size: 14px; color: #334155; font-style: italic; line-height: 1.5; }
          .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin: 28px 0 16px 0; }
          .two-col { display: table; width: 100%; table-layout: fixed; }
          .col { display: table-cell; width: 50%; vertical-align: top; padding-right: 12px; box-sizing: border-box; }
          .col:last-child { padding-right: 0; padding-left: 12px; border-left: 1px solid #f1f5f9; }
          .field-row { margin-bottom: 8px; font-size: 13px; color: #475569; line-height: 1.5; }
          .field-label { font-weight: 700; color: #1e293b; }
          .green-val { color: #10b981; font-weight: 800; }
          .link-btn { display: inline-block; color: #2563eb; text-decoration: none; font-weight: 600; font-size: 13px; }
          .metrics-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-top: 12px; }
          .metrics-grid { display: table; width: 100%; table-layout: fixed; margin-bottom: 12px; }
          .metric-cell { display: table-cell; width: 33.33%; vertical-align: top; padding: 4px; box-sizing: border-box; }
          .metric-lbl { font-size: 11px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
          .metric-val { font-size: 16px; font-weight: 600; color: #334155; }
          .declaration-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-top: 24px; font-size: 12px; color: #475569; line-height: 1.6; }
          .footer { background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <div class="top-label">NEW INVESTMENT APPLICATION</div>
            <h1 class="title">${startupName}</h1>
            <p class="subtitle">Applying to: <strong>${investorName || "Investor"}</strong></p>
          </div>
          <div class="body">
            ${formData.elevatorPitch ? `<div class="pitch-box">"${formData.elevatorPitch}"</div>` : ''}

            <div class="two-col">
              <div class="col">
                <div class="section-title" style="margin-top:0;">FUNDRAISING DETAILS</div>
                <div class="field-row"><span class="field-label">Raising Now:</span> <span class="green-val">${targetAmount}</span></div>
                <div class="field-row"><span class="field-label">Round:</span> ${formData.currentFundingRound || formData.fundingRound || "N/A"}</div>
                <div class="field-row"><span class="field-label">Instrument:</span> ${formData.fundingInstrument || "Equity"}</div>
                <div class="field-row"><span class="field-label">Current Valuation:</span> ${formData.currentValuation || "N/A"}</div>
                <div class="field-row"><span class="field-label">Runway:</span> ${formData.runway || "6-12 Months"}</div>
                <div class="field-row"><span class="field-label">Previously Raised:</span> ${formData.previouslyRaised || "N/A"}</div>
              </div>
              <div class="col">
                <div class="section-title" style="margin-top:0;">COMPANY PROFILE</div>
                <div class="field-row"><span class="field-label">Industry:</span> ${formData.industry || "N/A"}</div>
                <div class="field-row"><span class="field-label">Status:</span> ${formData.companyStatus || formData.legalStructure || "Registered (Pvt Ltd)"}</div>
                <div class="field-row"><span class="field-label">Incorporated:</span> ${formData.incorporationDate || "N/A"} in ${formData.founderCity || formData.registrationCountry || formData.location || "N/A"}</div>
              </div>
            </div>

            <div class="section-title">BUSINESS OVERVIEW</div>
            <div class="field-row"><div class="field-label">Problem:</div><div style="margin-top:2px;">${formData.problemStatement || formData.problem || "N/A"}</div></div>
            <div class="field-row" style="margin-top:10px;"><div class="field-label">Solution:</div><div style="margin-top:2px;">${formData.solution || "N/A"}</div></div>
            <div class="field-row" style="margin-top:10px;"><div class="field-label">Target Customers:</div><div style="margin-top:2px;">${formData.targetCustomers || "N/A"}</div></div>
            <div class="field-row" style="margin-top:10px;"><div class="field-label">Product Status:</div><div style="margin-top:2px;">${formData.productStatus || "N/A"}</div></div>

            <div class="section-title">MARKET & COMPETITION</div>
            <div class="field-row"><span class="field-label">TAM:</span> ${formData.tam || "N/A"} &nbsp;|&nbsp; <span class="field-label">SAM:</span> ${formData.sam || "N/A"} &nbsp;|&nbsp; <span class="field-label">SOM:</span> ${formData.som || "N/A"}</div>
            <div class="field-row" style="margin-top:10px;"><div class="field-label">Competitors:</div><div style="margin-top:2px;">${formData.competitors || "N/A"}</div></div>
            <div class="field-row" style="margin-top:10px;"><div class="field-label">Competitive Advantage:</div><div style="margin-top:2px;">${formData.competitiveAdvantage || "N/A"}</div></div>

            <div class="section-title">TRACTION & METRICS</div>
            <div class="metrics-box">
              <div class="metrics-grid">
                <div class="metric-cell">
                  <div class="metric-lbl">Total Users:</div>
                  <div class="metric-val">${formData.totalUsers || "N/A"}</div>
                </div>
                <div class="metric-cell">
                  <div class="metric-lbl">Active Users:</div>
                  <div class="metric-val">${formData.activeUsers || "N/A"}</div>
                </div>
                <div class="metric-cell">
                  <div class="metric-lbl">Paying Customers:</div>
                  <div class="metric-val">${formData.payingCustomers || "N/A"}</div>
                </div>
              </div>
              <div class="metrics-grid">
                <div class="metric-cell">
                  <div class="metric-lbl">Monthly Rev:</div>
                  <div class="metric-val">${formData.monthlyRevenue || "N/A"}</div>
                </div>
                <div class="metric-cell">
                  <div class="metric-lbl">Annual Rev:</div>
                  <div class="metric-val">${formData.annualRevenue || "N/A"}</div>
                </div>
                <div class="metric-cell">
                  <div class="metric-lbl">MoM Growth:</div>
                  <div class="metric-val">${formData.momGrowth || "N/A"}</div>
                </div>
              </div>
              <div style="margin-top:8px; font-size:12px;">
                <span class="field-label">Key Milestones:</span><br/>
                <span style="color:#475569;">${formData.keyAchievements || "N/A"}</span>
              </div>
            </div>

            <div class="section-title">DOCUMENTS & LINKS</div>
            <div style="margin-top:8px;">
              ${pitchDeck ? `<div style="margin-bottom:6px;"><a href="${pitchDeck}" class="link-btn" target="_blank">📄 View Pitch Deck</a></div>` : ''}
              ${financialModel ? `<div style="margin-bottom:6px;"><a href="${financialModel}" class="link-btn" target="_blank">📈 View Financial Model</a></div>` : ''}
              ${dataRoom ? `<div style="margin-bottom:6px;"><a href="${dataRoom}" class="link-btn" target="_blank">📁 View Data Room</a></div>` : ''}
              ${productDemo ? `<div style="margin-bottom:6px;"><a href="${productDemo}" class="link-btn" target="_blank">💻 View Product Demo</a></div>` : ''}
              ${(!pitchDeck && !financialModel && !dataRoom && !productDemo) ? '<div style="font-size:13px; color:#94a3b8;">No document links provided.</div>' : ''}
            </div>

            <div class="section-title">USE OF FUNDS ALLOCATION</div>
            <div class="field-row">
              <span class="field-label">Product Dev:</span> ${formData.productDevUse || "0"}% &nbsp;|&nbsp;
              <span class="field-label">Hiring:</span> ${formData.hiringUse || "0"}% &nbsp;|&nbsp;
              <span class="field-label">Marketing:</span> ${formData.marketingUse || "0"}% &nbsp;|&nbsp;
              <span class="field-label">Operations:</span> ${formData.operationsUse || "0"}% &nbsp;|&nbsp;
              <span class="field-label">Other:</span> ${formData.otherUse || "0"}%
            </div>

            <div class="section-title">FOUNDING TEAM</div>
            <div class="two-col">
              <div class="col">
                <div style="font-weight:700; font-size:15px; color:#0f172a;">${founderName}</div>
                <div style="font-size:13px; color:#64748b; margin-top:2px;">Founder • ${formData.founderBio || formData.founderCity || ''}</div>
              </div>
              <div class="col">
                ${formData.coFounderName ? `
                  <div style="font-weight:700; font-size:15px; color:#0f172a;">${formData.coFounderName}</div>
                  <div style="font-size:13px; color:#64748b; margin-top:2px;">Co-Founder</div>
                ` : '<div style="font-size:13px; color:#94a3b8; font-style:italic;">No Co-Founder specified.</div>'}
              </div>
            </div>

            <div class="declaration-box">
              <strong>✅ Founder Declaration:</strong> "I confirm that the information submitted is accurate and can be shared with selected investors through the RightSignal platform."
              <div style="margin-top:6px; color:#64748b; font-size:11px;">Signed by <strong>${formData.signedBy || founderName}</strong> on <strong>${new Date().toISOString().split('T')[0]}</strong></div>
            </div>
          </div>
          <div class="footer">
            Securely processed and verified by <strong>RightSignal</strong>
          </div>
        </div>
      </body>
      </html>
    `;

    let emailRes = null;
    let emailSent = false;
    let sendingError = null;

    const validInvestorEmail = investorEmail && typeof investorEmail === "string" && investorEmail.includes("@") ? investorEmail : null;
    const validFounderEmail = founderEmail && typeof founderEmail === "string" && founderEmail.includes("@") ? founderEmail : null;

    const fromDomain = process.env.RESEND_FROM_EMAIL || "RightSignal <onboarding@rightsignal.social>";
    const fallbackFrom = "RightSignal <onboarding@resend.dev>";
    const subjectLine = `RightSignal | Investment Application from ${startupName}`;

    // Send isolated email to recipient (no CC/BCC so investor & founder email addresses remain strictly private)
    const sendSingleMail = async (toEmail) => {
      try {
        return await resend.emails.send({
          from: fromDomain,
          to: [toEmail],
          subject: subjectLine,
          html: htmlContent,
        });
      } catch (sendErr) {
        console.warn(`[Resend] Primary domain sending failed for ${toEmail}, retrying with fallback domain:`, sendErr.message);
        return await resend.emails.send({
          from: fallbackFrom,
          to: [toEmail],
          subject: subjectLine,
          html: htmlContent,
        });
      }
    };

    if (validInvestorEmail) {
      try {
        emailRes = await sendSingleMail(validInvestorEmail);
        emailSent = true;
      } catch (err) {
        console.warn("[Resend] Failed to send email to investor:", err.message);
        sendingError = err.message;
      }
    }

    // Send separate isolated email copy to founder so neither investor nor founder sees each other's email ID
    if (validFounderEmail && validFounderEmail !== validInvestorEmail) {
      try {
        const founderMailRes = await sendSingleMail(validFounderEmail);
        if (!emailRes) emailRes = founderMailRes;
        emailSent = true;
      } catch (err) {
        console.warn("[Resend] Failed to send email to founder:", err.message);
        if (!emailSent) sendingError = err.message;
      }
    }

    if (emailSent) {
      console.log(`[Send Application] Successfully sent application for ${startupName} to ${investorEmail}`);
      return res.json({ success: true, emailSent: true, emailRes });
    } else {
      console.warn(`[Send Application Warning] Application saved, but email could not be delivered to ${investorEmail}: ${sendingError}`);
      return res.json({
        success: true,
        emailSent: false,
        warning: sendingError || "Email delivery was skipped due to unverified sender domain.",
      });
    }
  } catch (err) {
    console.error("[Send Application Error]:", err);
    return res.status(500).json({ error: err.message || "Failed to process application request" });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`API server running on port ${PORT}`);
});


