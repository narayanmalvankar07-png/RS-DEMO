import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, CheckCheck, Send, Loader2, Paperclip, Image, Mic, Smile, FileText, MoreVertical } from 'lucide-react';
import { SB_URL, T } from '../../config/constants.js';
import { db } from '../../services/supabase.js';
import { sendWSMessage, subscribeWS } from '../../services/websocket.js';
import Av from '../ui/Av.jsx';

interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface ParticipantRow {
  user_id: string;
  last_read_at?: string | null;
}

interface Profile {
  name?: string;
  avatar?: string;
  hue?: string;
}

interface AttachmentMeta {
  name?: string;
  type?: string;
  url?: string;
  path?: string;
  kind?: 'image' | 'pdf' | 'file';
  size?: number;
}

interface ConversationProps {
  conversationId: string;
  me: string;
  profiles: Record<string, Profile>;
  participants: string[];
  dk: boolean;
  name?: string;
  isGroup?: boolean;
}

export default function Conversation({
  conversationId,
  me,
  profiles,
  participants,
  dk,
  name,
  isGroup = false,
}: ConversationProps) {
  const th = T(dk);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isAligned, setIsAligned] = useState(true); // Assume aligned by default; will check
  const [participantRows, setParticipantRows] = useState<ParticipantRow[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<AttachmentMeta | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const [recordSecs, setRecordSecs] = useState(0);
  const recordTimerRef = useRef<number | null>(null);
  const pendingAudioRef = useRef<Blob | null>(null);
  const [pendingAudioName, setPendingAudioName] = useState<string | null>(null);

  const STICKERS = ['😂','🤣','😄','😁','😆','😊','🙂','😜','😎','😍','😭','😅','🤩','😇','🤪','😋'];

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingSentRef = useRef(false);
  const otherUid = participants.find(uid => uid !== me);
  const [replyingTo, setReplyingTo] = useState<null | { id: string; content: string; author?: string }>(null);
  const lastTapRef = useRef<number | null>(null);
  const pendingSentIdsRef = useRef<Set<string>>(new Set());
  const [openMenuMessageId, setOpenMenuMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const refreshReadState = useCallback(async () => {
    try {
      const rows = await db.get('rs_conversation_participants', `conversation_id=eq.${conversationId}`);
      setParticipantRows(rows || []);
      await db.patch('rs_conversation_participants', `conversation_id=eq.${conversationId}&user_id=eq.${me}`, {
        last_read_at: new Date().toISOString(),
      });
      setParticipantRows(prev => prev.map(row => row.user_id === me ? { ...row, last_read_at: new Date().toISOString() } : row));
    } catch {}
  }, [conversationId, me]);

  const hasBeenSeen = useCallback((createdAt: string) => {
    const sentAt = new Date(createdAt).getTime();
    if (!sentAt) return false;

    const others = participantRows.filter(row => row.user_id !== me);
    if (!others.length) return false;

    if (!isGroup) {
      const other = others.find(row => row.user_id === otherUid) || others[0];
      const readAt = other?.last_read_at ? new Date(other.last_read_at).getTime() : 0;
      return readAt >= sentAt;
    }

    return others.every(row => {
      const readAt = row.last_read_at ? new Date(row.last_read_at).getTime() : 0;
      return readAt >= sentAt;
    });
  }, [isGroup, me, otherUid, participantRows]);

  const parseMessageContent = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && ('text' in parsed || 'audio' in parsed || 'attachment' in parsed || 'reply_to' in parsed)) {
        const audio = parsed.audio;
        const attachment = parsed.attachment;
        const normalizedAudio = typeof audio === 'string'
          ? { url: audio }
          : audio && typeof audio === 'object'
            ? audio
            : null;
        const normalizedAttachment = typeof attachment === 'string'
          ? { url: attachment }
          : attachment && typeof attachment === 'object'
            ? { ...attachment, kind: attachment.kind || getAttachmentKind(attachment.type, attachment.name) }
            : null;

        return {
          text: typeof parsed.text === 'string' ? parsed.text : '',
          audio: normalizedAudio,
          attachment: normalizedAttachment,
          reply_to: parsed.reply_to || null,
        };
      }
    } catch {}
    return { text: raw, audio: null, attachment: null, reply_to: null };
  };

  const resolveAudioSrc = (audio: any) => {
    if (!audio) return '';
    if (typeof audio === 'string') return audio;
    return (
      audio.url ||
      audio.publicUrl ||
      audio.src ||
      (audio.path ? `${SB_URL}/storage/v1/object/public/audio/${audio.path}` : '') ||
      ''
    );
  };

  const resolveAudioLabel = (audio: any) => {
    if (!audio) return 'Audio message';
    if (typeof audio === 'string') return 'Audio message';
    return audio.name || audio.fileName || 'Audio message';
  };

  const getAttachmentKind = (fileType?: string, fileName?: string): AttachmentMeta['kind'] => {
    if (fileType?.startsWith('image/')) return 'image';
    if (fileType === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf')) return 'pdf';
    return 'file';
  };

  const resolveAttachmentSrc = (attachment: any) => {
    if (!attachment) return '';
    if (typeof attachment === 'string') return attachment;
    return attachment.url || attachment.publicUrl || attachment.src || '';
  };

  const buildEditedContent = (raw: string, nextText: string) => {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && ('text' in parsed || 'audio' in parsed || 'attachment' in parsed || 'reply_to' in parsed)) {
        return JSON.stringify({ ...parsed, text: nextText });
      }
    } catch {}
    return nextText;
  };

  const handleUserTyping = () => {
    if (!otherUid) return;

    if (!isTypingSentRef.current) {
      isTypingSentRef.current = true;
      sendWSMessage({
        type: 'typing',
        conversationId,
        targetUserId: otherUid,
        isTyping: true,
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendWSMessage({
        type: 'typing',
        conversationId,
        targetUserId: otherUid,
        isTyping: false,
      });
      isTypingSentRef.current = false;
    }, 2000);
  };

  const fetchMessages = useCallback(async (initial = false) => {
    const query =
      lastIdRef.current && !initial
        ? `conversation_id=eq.${conversationId}&id=gt.${lastIdRef.current}&order=created_at.asc`
        : `conversation_id=eq.${conversationId}&order=created_at.asc&limit=100`;

    const rows: Message[] = await db.get('rs_conversation_messages', query);
    if (!rows?.length) return;

    if (initial) {
      setMessages(rows);
    } else {
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const newMsgs = rows.filter(m => !existingIds.has(m.id));
        return newMsgs.length ? [...prev, ...newMsgs] : prev;
      });
    }
    lastIdRef.current = rows[rows.length - 1]?.id ?? lastIdRef.current;
  }, [conversationId]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    lastIdRef.current = null;
    setIsTyping(false);
    isTypingSentRef.current = false;
    
    // Check alignment with the other participant
    const otherParticipant = participants.find(uid => uid !== me);
    if (otherParticipant) {
      db.get('rs_alignments', `follower_uid=eq.${me}&following_uid=eq.${otherParticipant}`)
        .then(d => { setIsAligned(d && d.length > 0); })
        .catch(() => { setIsAligned(true); }); // Assume aligned on error
    }
    
    fetchMessages(true).finally(() => setLoading(false));
    refreshReadState();

    // Subscribe to live WebSockets instead of polling!
    const unsubscribe = subscribeWS((data) => {
      if (data.type === 'message' && data.message.conversation_id === conversationId) {
        if (data.message.user_id === me && pendingSentIdsRef.current.has(data.message.id)) {
          pendingSentIdsRef.current.delete(data.message.id);
          return;
        }

        setMessages(prev => {
          if (prev.find(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        if (data.message.user_id !== me) {
          refreshReadState();
        }
      } else if (data.type === 'typing' && data.conversationId === conversationId && data.userId !== me) {
        setIsTyping(data.isTyping);
      } else if (data.type === 'error') {
        // Rollback optimistic message if rate-limited
        if (lastIdRef.current) {
          setMessages(prev => prev.filter(m => m.id !== lastIdRef.current));
        }
        alert(data.message);
      }
    });

    return () => {
      unsubscribe();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId, me, refreshReadState]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (editingMessageId) {
      const current = messages.find(m => m.id === editingMessageId);
      if (current) {
        const parsed = parseMessageContent(current.content);
        setEditDraft(parsed.text || '');
      }
    }
  }, [editingMessageId, messages]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-message-action-menu]') || target?.closest('[data-message-action-button]')) return;
      setOpenMenuMessageId(null);
    };
    if (openMenuMessageId) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuMessageId]);

  const handleAttachClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAttachMenu(s => !s);
    // close sticker picker when toggling attach
    setShowStickerPicker(false);
  };

  const onSelectImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadingAttachment(true);
    setShowAttachMenu(false);
    setShowStickerPicker(false);

    (async () => {
      try {
        const uploadRes = await fetch('/api/upload-attachment', {
          method: 'POST',
          headers: {
            'x-user-id': me,
            'x-file-name': f.name,
            'Content-Type': f.type || 'application/octet-stream',
          },
          body: f,
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          throw new Error(errText || 'Attachment upload failed');
        }

        const { url, path } = await uploadRes.json();
        setPendingAttachment({
          name: f.name,
          type: f.type || 'application/octet-stream',
          url,
          path,
          kind: getAttachmentKind(f.type, f.name),
          size: f.size,
        });
      } catch (err) {
        console.error('Attachment upload failed:', err);
        alert('Could not upload the selected file.');
      } finally {
        setUploadingAttachment(false);
        if (imageInputRef.current) imageInputRef.current.value = '';
        if (pdfInputRef.current) pdfInputRef.current.value = '';
      }
    })();
  };

  

  const startRecording = async () => {
    try {
      // Request mono audio with low sample rate for compression
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,  // 16 kHz instead of 48kHz = 3x smaller
          channelCount: 1  // Mono instead of stereo = 2x smaller
        }
      });
      
      const mime = 'audio/webm';
      const mr = new MediaRecorder(stream, { 
        mimeType: mime,
        audioBitsPerSecond: 32000  // 32 kbps ultra-low bitrate (very compressed)
      });
      
      recordChunksRef.current = [];
      mr.ondataavailable = (ev) => { if (ev.data && ev.data.size) recordChunksRef.current.push(ev.data); };
      mr.onstop = () => {
        const blob = new Blob(recordChunksRef.current, { type: mime });
        pendingAudioRef.current = blob;
        const name = `recording-${Date.now()}.webm`;
        setPendingAudioName(name);
        
        // stop all tracks
        try { stream.getTracks().forEach(t => t.stop()); } catch {}
        setIsRecording(false);
        if (recordTimerRef.current) { window.clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
        setRecordSecs(0);
      };
      mr.start();
      recorderRef.current = mr;
      setIsRecording(true);
      setRecordSecs(0);
      recordTimerRef.current = window.setInterval(() => setRecordSecs(s => s + 1), 1000);
    } catch (err) {
      console.error('Microphone access denied', err);
      alert('Microphone access is required to record audio.');
    }
  };

  const stopRecording = () => {
    try {
      recorderRef.current?.stop();
    } catch (e) { }
    try { recorderRef.current = null; } catch {}
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handler = () => { setShowAttachMenu(false); setShowStickerPicker(false); };
    if (showAttachMenu || showStickerPicker) document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showAttachMenu, showStickerPicker]);

  // Cleanup recorder on unmount
  useEffect(() => {
    return () => {
      try { recorderRef.current?.state !== 'inactive' && recorderRef.current?.stop(); } catch {}
      if (recordTimerRef.current) { window.clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
    };
  }, []);

  const openStickerPicker = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowStickerPicker(true);
    setShowAttachMenu(false);
  };

  const selectSticker = (s: string) => {
    setText(prev => prev ? `${prev} ${s}` : s);
    setShowStickerPicker(false);
    setShowAttachMenu(false);
  };

  const startReplyTo = (msgId: string, content: string, author?: string) => {
    setReplyingTo({ id: msgId, content, author });
    // focus input if needed
  };

  const sendMessage = async () => {
    if ((!text.trim() && !pendingAudioRef.current && !pendingAttachment) || sending || uploadingAttachment) return;
    const content = text.trim();
    setText('');
    setSending(true);

    // Reset typing state
    if (otherUid) {
      sendWSMessage({
        type: 'typing',
        conversationId,
        targetUserId: otherUid,
        isTyping: false,
      });
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    isTypingSentRef.current = false;

    // Generate a globally unique, permanent ID client-side
    // This allows instant optimistic rendering without ever needing ID updates!
    const permanentId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    pendingSentIdsRef.current.add(permanentId);

    const msg: Message = {
      id: permanentId,
      conversation_id: conversationId,
      user_id: me,
      content,
      created_at: new Date().toISOString(),
    };
    const payload: any = { text: content };

    // If there's a recorded audio blob, upload to cloud storage
    if (pendingAudioRef.current && pendingAudioName) {
      const blob = pendingAudioRef.current;
      
      // Convert blob to binary for upload
      try {
        const uploadRes = await fetch('/api/upload-audio', {
          method: 'POST',
          headers: { 
            'x-user-id': me,
            'x-file-name': pendingAudioName,
            'Content-Type': 'audio/webm'
          },
          body: blob  // Send blob directly - fetch will handle binary encoding
        });
        
        if (uploadRes.ok) {
          const { url, path } = await uploadRes.json();
          // Store only the public URL
          payload.audio = { name: pendingAudioName, type: blob.type, url, path };
          console.log('[Upload] Success:', url);
        } else {
          const errText = await uploadRes.text();
          console.error('Upload failed:', uploadRes.status, errText);
          // Fallback: store metadata only if upload fails
          payload.audio = { name: pendingAudioName, type: blob.type };
        }
      } catch (err) {
        console.error('Audio upload failed:', err);
        // Fallback: store metadata only if upload fails
        payload.audio = { name: pendingAudioName, type: blob.type };
      }
      
      // clear pending audio
      pendingAudioRef.current = null;
      setPendingAudioName(null);
    }

    if (pendingAttachment) {
      payload.attachment = pendingAttachment;
      setPendingAttachment(null);
    }

    // Attach reply metadata if replyingTo set
    if (replyingTo) {
      payload.reply_to = { id: replyingTo.id, content: replyingTo.content, author: replyingTo.author };
      setReplyingTo(null);
    }

    msg.content = (payload.audio || payload.attachment || payload.reply_to) ? JSON.stringify(payload) : content;

    // 1. Optimistic Local Render (instant UX!)
    setMessages(prev => [...prev, msg]);

    // 2. Broadcast and queue via WebSocket (relays in-memory instantly, batches writes to DB!)
    sendWSMessage({
      type: 'send_message',
      message: msg,
      participants,
    });

    // 3. Mark last ID and optimistically update conversation timestamp in cache
    lastIdRef.current = permanentId;
    db.patch('rs_conversations', `id=eq.${conversationId}`, { updated_at: new Date().toISOString() });

    setSending(false);
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: th.txt3, padding: 40 }}>
        <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', marginRight: 10 }} />
        <span style={{ fontSize: 14 }}>Loading messages…</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px 12px 4px', display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0, scrollBehavior: 'smooth' }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: th.txt3, fontSize: 13, padding: 40, textAlign: 'center' }}>
            No messages yet — say hello! 👋
          </div>
        ) : (
          messages.map((msg, idx) => {
            const fromMe = msg.user_id === me;
            const prof = profiles[msg.user_id] || { name: 'User' };
            const prevSame = idx > 0 && messages[idx - 1].user_id === msg.user_id;
            const showAvatar = !fromMe && !prevSame;
            const parsed = parseMessageContent(msg.content);
            const replyPreview = parsed.reply_to?.content || '';
            const audioSrc = resolveAudioSrc(parsed.audio);
            const attachmentSrc = resolveAttachmentSrc(parsed.attachment);
            const attachmentKind = parsed.attachment?.kind || getAttachmentKind(parsed.attachment?.type, parsed.attachment?.name);
            const bubbleText = parsed.text || '';
            const seen = fromMe && hasBeenSeen(msg.created_at);

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: fromMe ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-end',
                  gap: 8,
                  marginBottom: prevSame ? 2 : 8,
                  paddingLeft: fromMe ? 0 : 36,
                  position: 'relative',
                }}
              >
                {!fromMe && (
                  <div style={{ position: 'absolute', left: 0, bottom: 0 }}>
                    {showAvatar && <Av profile={prof} size={28} />}
                  </div>
                )}

                <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: fromMe ? 'flex-end' : 'flex-start' }}>
                  {isGroup && !fromMe && showAvatar && (
                    <span style={{ fontSize: 11, color: th.txt3, marginBottom: 3, paddingLeft: 2 }}>
                      {(prof as Profile).name || 'User'}
                    </span>
                  )}
                  <div style={{ position: 'relative', width: '100%' }}>
                    {fromMe && (
                      <>
                        <button
                          type="button"
                          data-message-action-button
                          aria-label="Message options"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuMessageId(prev => prev === msg.id ? null : msg.id);
                          }}
                          style={{
                            position: 'absolute',
                            bottom: 2,
                            right: 0,
                            width: 22,
                            height: 22,
                            border: 'none',
                            background: 'transparent',
                            color: th.txt2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: 'none',
                            padding: 0,
                            zIndex: 2,
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openMenuMessageId === msg.id && editingMessageId !== msg.id && (
                          <div
                            data-message-action-menu
                            style={{
                              position: 'absolute',
                              top: 24,
                              right: 0,
                              minWidth: 120,
                              background: th.surf,
                              border: `1px solid ${th.bdr}`,
                              borderRadius: 12,
                              padding: 6,
                              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.16)',
                              zIndex: 20,
                            }}
                          >
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                setOpenMenuMessageId(null);
                                await db.del('rs_conversation_messages', `id=eq.${msg.id}`);
                                setMessages(prev => prev.filter(m => m.id !== msg.id));
                              }}
                              style={{ width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', borderRadius: 8, cursor: 'pointer', color: '#ef4444', fontSize: 13, fontWeight: 600 }}
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuMessageId(null);
                                setEditingMessageId(msg.id);
                              }}
                              style={{ width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', borderRadius: 8, cursor: 'pointer', color: th.txt, fontSize: 13, fontWeight: 600 }}
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    {editingMessageId === msg.id && (
                      <div style={{ marginTop: 8, padding: 10, borderRadius: 12, background: th.surf, border: `1px solid ${th.bdr}`, minWidth: 240 }}>
                        <textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          rows={3}
                          style={{ width: '100%', resize: 'none', borderRadius: 10, border: `1px solid ${th.bdr}`, background: th.inp, color: th.txt, padding: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
                        />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingMessageId(null);
                              setEditDraft('');
                            }}
                            style={{ border: 'none', background: 'transparent', color: th.txt3, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const current = messages.find(m => m.id === msg.id);
                              if (!current) return;
                              const nextText = editDraft.trim();
                              const content = buildEditedContent(current.content, nextText);
                              await db.patch('rs_conversation_messages', `id=eq.${msg.id}`, { content });
                              setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content } : m));
                              setEditingMessageId(null);
                            }}
                            style={{ border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '8px 12px', borderRadius: 10 }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                        <div
                          role="button"
                          tabIndex={0}
                          onDoubleClick={() => startReplyTo(msg.id, String(bubbleText || 'Audio message'), (profiles[msg.user_id]?.name || '').toString())}
                          onTouchEnd={() => {
                            const now = Date.now();
                            if (lastTapRef.current && now - lastTapRef.current < 350) {
                              startReplyTo(msg.id, String(bubbleText || 'Audio message'), (profiles[msg.user_id]?.name || '').toString());
                              lastTapRef.current = null;
                            } else {
                              lastTapRef.current = now;
                            }
                          }}
                          style={{
                            padding: '10px 14px',
                            borderRadius: fromMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            background: fromMe
                              ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                              : dk ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                            color: fromMe ? '#fff' : th.txt,
                            fontSize: 14,
                            lineHeight: 1.5,
                            wordBreak: 'break-word',
                            opacity: msg.id.startsWith('temp_') ? 0.6 : 1,
                            boxShadow: fromMe ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                            transition: 'opacity 0.2s',
                            cursor: 'pointer',
                          }}
                        >
                          {/* If this message is a reply to another, render quoted preview */}
                          {parsed.reply_to ? (
                            <div style={{ marginBottom: 8, padding: '6px 8px', borderRadius: 8, background: dk ? 'rgba(255,255,255,0.02)' : '#f1f5f9', color: th.txt3, fontSize: 12 }}>
                              {replyPreview.slice(0, 120)}
                            </div>
                          ) : null}
                          {bubbleText ? (
                            <div style={{ marginBottom: (parsed.audio || parsed.attachment) ? 8 : 0 }}>{bubbleText}</div>
                          ) : null}
                          { parsed.audio ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
                              {audioSrc ? (
                                <audio controls preload="none" src={audioSrc} style={{ width: '100%', maxWidth: '300px', height: 38 }} />
                              ) : (
                                <div style={{ fontSize: 13, color: fromMe ? '#fff' : th.txt, padding: '10px 12px', background: fromMe ? 'rgba(255,255,255,0.15)' : (dk ? 'rgba(255,255,255,0.05)' : '#f1f5f9'), borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  🎵 {resolveAudioLabel(parsed.audio)}
                                </div>
                              )}
                            </div>
                          ) : parsed.attachment ? (
                            attachmentKind === 'image' && attachmentSrc ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
                                <a href={attachmentSrc} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                                  <img
                                    src={attachmentSrc}
                                    alt={parsed.attachment.name || 'Image attachment'}
                                    style={{ maxWidth: '300px', maxHeight: '260px', width: '100%', borderRadius: 12, objectFit: 'cover', display: 'block' }}
                                  />
                                </a>
                                <div style={{ fontSize: 12, color: fromMe ? 'rgba(255,255,255,0.8)' : th.txt3 }}>{parsed.attachment.name}</div>
                              </div>
                            ) : (
                              <a
                                href={attachmentSrc || '#'}
                                target="_blank"
                                rel="noreferrer"
                                style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}
                                onClick={e => { if (!attachmentSrc) e.preventDefault(); }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 220, padding: '10px 12px', borderRadius: 10, background: fromMe ? 'rgba(255,255,255,0.15)' : (dk ? 'rgba(255,255,255,0.05)' : '#f1f5f9') }}>
                                  <div style={{ width: 34, height: 34, borderRadius: 10, background: fromMe ? 'rgba(255,255,255,0.18)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <FileText size={16} color={fromMe ? '#fff' : '#64748b'} />
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: fromMe ? '#fff' : th.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{parsed.attachment.name || 'Attachment'}</div>
                                    <div style={{ fontSize: 11, color: fromMe ? 'rgba(255,255,255,0.72)' : th.txt3, textTransform: 'uppercase' }}>{attachmentKind === 'pdf' ? 'PDF document' : 'File attachment'}</div>
                                  </div>
                                </div>
                              </a>
                            )
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
                              {fromMe && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', marginBottom: 1, color: seen ? '#60a5fa' : 'rgba(255,255,255,0.75)' }}>
                                  {seen ? <CheckCheck size={15} /> : <Check size={15} />}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                  </div>
                  <span style={{ fontSize: 10, color: th.txt3, marginTop: 3, paddingLeft: 2, paddingRight: 2, opacity: prevSame ? 0.9 : 1 }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        {isTyping && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 12px', fontSize: 12, color: th.txt3 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: 'pulse 1s infinite' }} />
            <span>Someone is typing...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          paddingTop: 12,
          borderTop: `1px solid ${th.bdr}`,
          marginTop: 'auto',
          flexShrink: 0,
          alignItems: 'center',
          position: 'relative',
        }}
      >
        {/* Reply preview (when replyingTo is set) */}
        {replyingTo && (
          <div style={{ position: 'absolute', left: 64, right: 120, bottom: pendingAttachment ? 104 : 60, background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 12, padding: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 12, color: th.txt3, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyingTo.author ? `${replyingTo.author}: ` : ''}{replyingTo.content}</div>
            <button onClick={() => setReplyingTo(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: th.txt3 }}>✕</button>
          </div>
        )}
        {pendingAttachment && !uploadingAttachment && (
          <div style={{ position: 'absolute', left: 64, right: 120, bottom: replyingTo ? 60 : 60, background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 12, padding: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: pendingAttachment.kind === 'image' ? '#dbeafe' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {pendingAttachment.kind === 'image' ? <Image size={15} color="#3b82f6" /> : <FileText size={15} color="#64748b" />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: th.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pendingAttachment.name}</div>
              <div style={{ fontSize: 11, color: th.txt3 }}>{pendingAttachment.kind === 'pdf' ? 'PDF ready to send' : 'Image ready to send'}</div>
            </div>
            <button onClick={() => setPendingAttachment(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: th.txt3 }}>✕</button>
          </div>
        )}
        {uploadingAttachment && (
          <div style={{ position: 'absolute', left: 64, right: 120, bottom: 60, background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 12, padding: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: th.txt3 }} />
            <div style={{ fontSize: 12, color: th.txt3 }}>Uploading attachment…</div>
          </div>
        )}
        {/* Hidden file inputs for attachments */}
        <input ref={imageInputRef as any} onChange={onSelectImage} type="file" accept="image/*" style={{ display: 'none' }} />
        <input ref={pdfInputRef as any} onChange={onSelectImage} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} />
        
        {/* Attach button + popover */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button onClick={handleAttachClick} title="Attach" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 10, display: 'flex', alignItems: 'center', color: th.txt2 }}>
            <Paperclip size={18} />
          </button>
          {showAttachMenu && !showStickerPicker && (
            <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 44, left: 0, background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 12, padding: 8, boxShadow: '0 8px 24px rgba(2,6,23,0.08)', display: 'flex', flexDirection: 'column', gap: 6, zIndex: 60 }}>
              <button onClick={() => imageInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: th.txt }}><Image size={16} /> Image</button>
              <button onClick={() => pdfInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: th.txt }}><FileText size={16} /> PDF</button>
              <button onClick={openStickerPicker} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: th.txt }}><Smile size={16} /> Sticker</button>
            </div>
          )}

          {/* Sticker picker panel */}
          {showStickerPicker && (
            <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 44, left: 0, width: 320, maxWidth: '90vw', background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 12, padding: 10, boxShadow: '0 12px 36px rgba(2,6,23,0.12)', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, zIndex: 70 }}>
              {STICKERS.map(s => (
                <button key={s} onClick={() => selectSticker(s)} style={{ fontSize: 22, padding: 6, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer' }}>
                  {s}
                </button>
              ))}
            </div>
          )}
          {/* Recording UI (shows while recording) */}
          {isRecording && (
            <div style={{ position: 'absolute', bottom: 44, left: 0, width: 280, background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 12, padding: 12, boxShadow: '0 12px 36px rgba(2,6,23,0.12)', zIndex: 80 }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 12, height: 12, borderRadius: 6, background: '#ef4444', boxShadow: '0 0 8px rgba(239,68,68,0.6)', }} />
                <div style={{ fontWeight: 700 }}>Recording…</div>
                <div style={{ marginLeft: 'auto', fontSize: 12, color: th.txt3 }}>{Math.floor(recordSecs/60).toString().padStart(2,'0')}:{(recordSecs%60).toString().padStart(2,'0')}</div>
                <button onClick={(e) => { e.stopPropagation(); stopRecording(); }} style={{ marginLeft: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: th.txt }}>
                  Stop
                </button>
              </div>
            </div>
          )}
        </div>
        <input
          value={text}
          onChange={e => {
            setText(e.target.value);
            handleUserTyping();
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
          }}
          placeholder="Type a message…"
          style={{
            flex: 1,
            borderRadius: 14,
            border: `1px solid ${th.inpB}`,
            background: th.inp,
            color: th.txt,
            padding: '11px 14px',
            outline: 'none',
            fontSize: 14,
            fontFamily: 'inherit',
          }}
          data-testid="input-message"
        />
        <button
          onClick={(e) => { e.stopPropagation(); isRecording ? stopRecording() : startRecording(); }}
          title={isRecording ? 'Stop recording' : 'Record audio'}
          style={{
            marginLeft: 8,
            borderRadius: 12,
            border: 'none',
            background: isRecording ? 'linear-gradient(135deg,#ef4444,#f97316)' : (dk ? 'rgba(255,255,255,0.07)' : '#f1f5f9'),
            color: isRecording ? '#fff' : th.txt3,
            padding: '9px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s',
            flexShrink: 0,
          }}
        >
          <Mic size={16} />
        </button>
        <button
          onClick={sendMessage}
          disabled={(!text.trim() && !pendingAudioRef.current && !pendingAttachment) || sending || uploadingAttachment || !isAligned}
          title={!isAligned ? 'You must be aligned with this user to send messages' : ''}
          style={{
            borderRadius: 14,
            border: 'none',
            background: ((text.trim() || pendingAudioRef.current || pendingAttachment) && isAligned) ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : (dk ? 'rgba(255,255,255,0.07)' : '#f1f5f9'),
            color: ((text.trim() || pendingAudioRef.current || pendingAttachment) && isAligned) ? '#fff' : th.txt3,
            padding: '11px 16px',
            cursor: ((text.trim() || pendingAudioRef.current || pendingAttachment) && isAligned) ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s',
            fontWeight: 600,
            fontSize: 14,
            flexShrink: 0,
          }}
          data-testid="button-send-message"
        >
          {sending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
