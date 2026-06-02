import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, CheckCheck, Send, Loader2, Paperclip, Image, Mic, Smile, FileText, MoreVertical } from 'lucide-react';
import { SB_URL, T } from '../../config/constants.js';
import { db } from '../../services/supabase.js';
import { sendWSMessage, subscribeWS } from '../../services/websocket.js';
import Av from '../ui/Av.jsx';
import { toast } from 'sonner';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const ALL_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾',
  '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💖', '💗', '💓', '💞', '💕', '💘', '💝', '💟', '🌟', '⭐', '✨', '⚡', '💥', '🔥', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '❄️', '💨', '💧', '💦', '🫧', '☂️', '☔', '⛱️', '🍀', '🍁', '🍂', '🌸', '🌹', '🌺', '🌻', '🌼', '🌷', '🌱', '🪴', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍃'
];


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
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Visualizer and Auto-send refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sendAfterRecordingRef = useRef(false);

  const discardAudio = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    pendingAudioRef.current = null;
    setPendingAudioName(null);
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const STICKERS = ['😂', '🤣', '😄', '😁', '😆', '😊', '🙂', '😜', '😎', '😍', '😭', '😅', '🤩', '😇', '🤪', '😋'];

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingSentRef = useRef(false);
  const otherUid = participants.find(uid => uid !== me);
  const [replyingTo, setReplyingTo] = useState<null | { id: string; content: string; author?: string }>(null);
  const lastTapRef = useRef<number | null>(null);
  const pendingSentIdsRef = useRef<Set<string>>(new Set());
  const [openMenuMessageId, setOpenMenuMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [openReactionPickerId, setOpenReactionPickerId] = useState<string | null>(null);
  const [showComposerEmojiPicker, setShowComposerEmojiPicker] = useState(false);

  const refreshReadState = useCallback(async () => {
    try {
      const rows = await db.get('rs_conversation_participants', `conversation_id=eq.${conversationId}`);
      setParticipantRows(rows || []);
      await db.patch('rs_conversation_participants', `conversation_id=eq.${conversationId}&user_id=eq.${me}`, {
        last_read_at: new Date().toISOString(),
      });
      setParticipantRows(prev => prev.map(row => row.user_id === me ? { ...row, last_read_at: new Date().toISOString() } : row));
    } catch { }
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
      if (parsed && typeof parsed === 'object') {
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
          reactions: parsed.reactions || {},
        };
      }
    } catch { }
    return { text: raw, audio: null, attachment: null, reply_to: null, reactions: {} };
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
      if (parsed && typeof parsed === 'object') {
        return JSON.stringify({ ...parsed, text: nextText });
      }
    } catch { }
    return JSON.stringify({ text: nextText, reactions: {} });
  };

  const buildReactedContent = (raw: string, nextReactions: Record<string, string[]>) => {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return JSON.stringify({ ...parsed, reactions: nextReactions });
      }
    } catch { }
    return JSON.stringify({ text: raw, reactions: nextReactions });
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

  const toggleReaction = async (msgId: string, emoji: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    const parsed = parseMessageContent(msg.content);
    const currentReactions = parsed.reactions || {};
    const userIds = currentReactions[emoji] ? [...currentReactions[emoji]] : [];

    const index = userIds.indexOf(me);
    if (index > -1) {
      userIds.splice(index, 1);
    } else {
      userIds.push(me);
    }

    const nextReactions = { ...currentReactions };
    if (userIds.length > 0) {
      nextReactions[emoji] = userIds;
    } else {
      delete nextReactions[emoji];
    }

    const content = buildReactedContent(msg.content, nextReactions);

    // Save to database
    try {
      await db.patch('rs_conversation_messages', `id=eq.${msgId}`, { content });
    } catch (e) {
      console.error("Failed to save reaction to DB:", e);
    }

    // Update local state
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content } : m));

    // Broadcast reaction
    sendWSMessage({
      type: 'react_message',
      messageId: msgId,
      conversationId,
      reactions: nextReactions,
      participants,
    });
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
      } else if (data.type === 'edit_message' && data.conversationId === conversationId) {
        setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, content: data.content } : m));
      } else if (data.type === 'delete_message' && data.conversationId === conversationId) {
        setMessages(prev => prev.filter(m => m.id !== data.messageId));
      } else if (data.type === 'react_message' && data.conversationId === conversationId) {
        setMessages(prev => prev.map(m => {
          if (m.id === data.messageId) {
            // Rebuild the message content with new reactions
            const parsed = parseMessageContent(m.content);
            const updatedContent = JSON.stringify({ ...parsed, reactions: data.reactions });
            return { ...m, content: updatedContent };
          }
          return m;
        }));
      } else if (data.type === 'typing' && data.conversationId === conversationId && data.userId !== me) {
        setIsTyping(data.isTyping);
      } else if (data.type === 'error') {
        // Rollback optimistic message if rate-limited
        if (lastIdRef.current) {
          setMessages(prev => prev.filter(m => m.id !== lastIdRef.current));
        }
        toast.error(data.message);
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
      setOpenReactionPickerId(null);
    };
    if (openMenuMessageId || openReactionPickerId) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuMessageId, openReactionPickerId]);

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
        toast.error('Could not upload the selected file.');
      } finally {
        setUploadingAttachment(false);
        if (imageInputRef.current) imageInputRef.current.value = '';
        if (pdfInputRef.current) pdfInputRef.current.value = '';
      }
    })();
  };

  const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  };

  const startVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvasRef.current) return;
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = 3;
      const barGap = 2;
      const totalBarWidth = barWidth + barGap;
      const numBars = Math.floor(canvas.width / totalBarWidth);
      const centerY = canvas.height / 2;

      for (let i = 0; i < numBars; i++) {
        const dataIndex = Math.floor((i / numBars) * bufferLength);
        const val = dataArray[dataIndex] || 0;
        const percent = val / 255;
        const barHeight = Math.max(2, percent * (canvas.height - 4));

        const x = i * totalBarWidth;
        const y = centerY - barHeight / 2;

        const grad = ctx.createLinearGradient(x, y, x, y + barHeight);
        grad.addColorStop(0, '#8b5cf6');
        grad.addColorStop(1, '#6366f1');
        ctx.fillStyle = grad;

        drawRoundedRect(ctx, x, y, barWidth, barHeight, 1.5);
      }
    };

    draw();
  };

  useEffect(() => {
    if (isRecording && canvasRef.current && analyserRef.current) {
      startVisualizer();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isRecording]);

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

      // Set up AudioContext & Analyser Node for visualizer
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64; // Small fftSize is perfect for 15-20 bars
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          audioCtxRef.current = audioCtx;
          analyserRef.current = analyser;
        }
      } catch (ae) {
        console.error('Failed to init Web Audio visualizer:', ae);
      }

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
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // stop all tracks
        try { stream.getTracks().forEach(t => t.stop()); } catch { }
        setIsRecording(false);
        if (recordTimerRef.current) { window.clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
        setRecordSecs(0);

        // Cleanup audio visualizer context
        if (audioCtxRef.current) {
          try { audioCtxRef.current.close(); } catch { }
          audioCtxRef.current = null;
        }
        analyserRef.current = null;

        // Auto-send if Send was clicked during active recording
        if (sendAfterRecordingRef.current) {
          sendAfterRecordingRef.current = false;
          sendMessage();
        }
      };
      mr.start();
      recorderRef.current = mr;
      setIsRecording(true);
      setRecordSecs(0);
      recordTimerRef.current = window.setInterval(() => setRecordSecs(s => s + 1), 1000);
    } catch (err) {
      console.error('Microphone access denied', err);
      toast.warning('Microphone access is required to record audio.');
    }
  };

  const stopRecording = () => {
    try {
      recorderRef.current?.stop();
    } catch (e) { }
    try { recorderRef.current = null; } catch { }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handler = () => {
      setShowAttachMenu(false);
      setShowStickerPicker(false);
      setShowComposerEmojiPicker(false);
    };
    if (showAttachMenu || showStickerPicker || showComposerEmojiPicker) document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showAttachMenu, showStickerPicker, showComposerEmojiPicker]);

  // Cleanup recorder on unmount
  useEffect(() => {
    return () => {
      try { recorderRef.current?.state !== 'inactive' && recorderRef.current?.stop(); } catch { }
      if (recordTimerRef.current) { window.clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch { }
      }
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
    if (isRecording) {
      sendAfterRecordingRef.current = true;
      stopRecording();
      return;
    }
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
    if (pendingAudioRef.current) {
      const blob = pendingAudioRef.current;
      const audioName = pendingAudioName || `recording-${Date.now()}.webm`;

      // Convert blob to binary for upload
      try {
        const uploadRes = await fetch('/api/upload-audio', {
          method: 'POST',
          headers: {
            'x-user-id': me,
            'x-file-name': audioName,
            'Content-Type': 'audio/webm'
          },
          body: blob  // Send blob directly - fetch will handle binary encoding
        });

        if (uploadRes.ok) {
          const { url, path } = await uploadRes.json();
          // Store only the public URL
          payload.audio = { name: audioName, type: blob.type, url, path };
          console.log('[Upload] Success:', url);
        } else {
          const errText = await uploadRes.text();
          console.error('Upload failed:', uploadRes.status, errText);
          // Fallback: store metadata only if upload fails
          payload.audio = { name: audioName, type: blob.type };
        }
      } catch (err) {
        console.error('Audio upload failed:', err);
        // Fallback: store metadata only if upload fails
        payload.audio = { name: audioName, type: blob.type };
      }

      // clear pending audio
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
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
                    {/* Options button (rendered on the side opposite to the bubble) */}
                    <button
                      type="button"
                      data-message-action-button
                      aria-label="Message options"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuMessageId(prev => prev === msg.id ? null : msg.id);
                        setOpenReactionPickerId(null);
                      }}
                      style={{
                        position: 'absolute',
                        bottom: 2,
                        left: fromMe ? -28 : 'auto',
                        right: fromMe ? 'auto' : -28,
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

                    {/* Main Options Menu */}
                    {openMenuMessageId === msg.id && editingMessageId !== msg.id && openReactionPickerId !== msg.id && (
                      <div
                        data-message-action-menu
                        style={{
                          position: 'absolute',
                          top: 24,
                          left: fromMe ? 0 : 'auto',
                          right: fromMe ? 'auto' : 0,
                          minWidth: 200,
                          background: th.surf,
                          border: `1px solid ${th.bdr}`,
                          borderRadius: 16,
                          padding: 8,
                          boxShadow: '0 12px 30px rgba(15, 23, 42, 0.16)',
                          zIndex: 20,
                          backdropFilter: th.blur,
                          WebkitBackdropFilter: th.blur,
                        }}
                      >
                        {/* Quick Reactions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingBottom: 6, borderBottom: `1px solid ${th.bdr}`, marginBottom: 6 }}>
                          {QUICK_REACTIONS.map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleReaction(msg.id, emoji);
                                setOpenMenuMessageId(null);
                              }}
                              style={{
                                fontSize: 18,
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px 4px',
                                borderRadius: 4,
                                transition: 'transform 0.15s',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              {emoji}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenReactionPickerId(msg.id);
                            }}
                            style={{
                              fontSize: 14,
                              background: dk ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px 6px',
                              borderRadius: 6,
                              color: th.txt,
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            +
                          </button>
                        </div>

                        {/* Standard Options */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuMessageId(null);
                            startReplyTo(msg.id, String(bubbleText || 'Audio message'), (profiles[msg.user_id]?.name || '').toString());
                          }}
                          style={{ width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', borderRadius: 8, cursor: 'pointer', color: th.txt, fontSize: 13, fontWeight: 600 }}
                        >
                          Reply
                        </button>

                        {bubbleText && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuMessageId(null);
                              navigator.clipboard.writeText(bubbleText);
                              toast.success("Message copied to clipboard");
                            }}
                            style={{ width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', borderRadius: 8, cursor: 'pointer', color: th.txt, fontSize: 13, fontWeight: 600 }}
                          >
                            Copy Text
                          </button>
                        )}

                        {fromMe && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuMessageId(null);
                                const isNew = (Date.now() - new Date(msg.created_at).getTime()) < 5 * 60 * 1000;
                                if (!isNew) {
                                  toast.error("You can't update after 5 min");
                                } else {
                                  setEditingMessageId(msg.id);
                                }
                              }}
                              style={{ width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', borderRadius: 8, cursor: 'pointer', color: th.txt, fontSize: 13, fontWeight: 600 }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                setOpenMenuMessageId(null);
                                await db.del('rs_conversation_messages', `id=eq.${msg.id}`);
                                setMessages(prev => prev.filter(m => m.id !== msg.id));
                                sendWSMessage({
                                  type: 'delete_message',
                                  messageId: msg.id,
                                  conversationId,
                                  participants,
                                });
                              }}
                              style={{ width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', borderRadius: 8, cursor: 'pointer', color: '#ef4444', fontSize: 13, fontWeight: 600 }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Secondary Reaction Picker Grid Popover */}
                    {openReactionPickerId === msg.id && (
                      <div
                        data-message-action-menu
                        onClick={e => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          top: 24,
                          left: fromMe ? 0 : 'auto',
                          right: fromMe ? 'auto' : 0,
                          width: 260,
                          height: 200,
                          background: th.surf,
                          border: `1px solid ${th.bdr}`,
                          borderRadius: 16,
                          padding: 10,
                          boxShadow: '0 12px 30px rgba(15, 23, 42, 0.16)',
                          zIndex: 30,
                          display: 'flex',
                          flexDirection: 'column',
                          backdropFilter: th.blur,
                          WebkitBackdropFilter: th.blur,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottom: `1px solid ${th.bdr}`, paddingBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: th.txt2 }}>React with Emoji</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenReactionPickerId(null);
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: th.txt3, fontSize: 12 }}
                          >
                            Close
                          </button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                          {ALL_EMOJIS.slice(0, 120).map(emoji => (
                            <button
                              key={emoji}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleReaction(msg.id, emoji);
                                setOpenReactionPickerId(null);
                                setOpenMenuMessageId(null);
                              }}
                              style={{
                                fontSize: 20,
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 4,
                                borderRadius: 8,
                                transition: 'background 0.1s',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = dk ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
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
                              const isNew = (Date.now() - new Date(current.created_at).getTime()) < 5 * 60 * 1000;
                              if (!isNew) {
                                toast.error("You can't update after 5 min");
                                setEditingMessageId(null);
                                setEditDraft('');
                                return;
                              }
                              const nextText = editDraft.trim();
                              const content = buildEditedContent(current.content, nextText);
                              await db.patch('rs_conversation_messages', `id=eq.${msg.id}`, { content });
                              setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, content } : m));
                              sendWSMessage({
                                type: 'edit_message',
                                messageId: msg.id,
                                conversationId,
                                content,
                                participants,
                              });
                              setEditingMessageId(null);
                              setEditDraft('');
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
                      {parsed.audio ? (
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

                    {/* Reaction Badges */}
                    {parsed.reactions && Object.keys(parsed.reactions).length > 0 && (
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 4,
                        marginTop: 4,
                        justifyContent: fromMe ? 'flex-end' : 'flex-start',
                        width: '100%',
                      }}>
                        {Object.entries(parsed.reactions).map(([emoji, uids]) => {
                          if (!Array.isArray(uids) || uids.length === 0) return null;
                          const reactedByMe = uids.includes(me);
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleReaction(msg.id, emoji);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 8px',
                                borderRadius: 12,
                                border: `1px solid ${reactedByMe ? '#6366f1' : th.bdr}`,
                                background: reactedByMe
                                  ? (dk ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)')
                                  : (dk ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                                color: reactedByMe ? '#6366f1' : th.txt2,
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: 600,
                                transition: 'all 0.15s',
                                backdropFilter: th.blur,
                                WebkitBackdropFilter: th.blur,
                                boxShadow: reactedByMe ? '0 2px 8px rgba(99,102,241,0.15)' : 'none',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              <span>{emoji}</span>
                              <span style={{ fontSize: 10, color: reactedByMe ? '#6366f1' : th.txt3 }}>{uids.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
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
      {(() => {
        let replyBottom = 60;
        let attachBottom = 60;
        let audioBottom = 60;

        let currentBottom = 60;
        if (pendingAudioName && audioUrl) {
          audioBottom = currentBottom;
          currentBottom += 54;
        }
        if (pendingAttachment && !uploadingAttachment) {
          attachBottom = currentBottom;
          currentBottom += 54;
        }
        if (replyingTo) {
          replyBottom = currentBottom;
        }

        return (
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
            {/* Voice Note Preview (staged) */}
            {pendingAudioName && audioUrl && (
              <div style={{ position: 'absolute', left: 64, right: 120, bottom: audioBottom, background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, backdropFilter: th.blur, WebkitBackdropFilter: th.blur }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', color: '#6366f1', flexShrink: 0 }}>
                  <Mic size={14} />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: th.txt, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>Voice Note</span>
                  <audio src={audioUrl} controls style={{ height: 28, flex: 1, maxWidth: 220 }} />
                </div>
                <button onClick={discardAudio} style={{ background: 'none', border: 'none', cursor: 'pointer', color: th.txt3, padding: 4, display: 'flex', alignItems: 'center' }}>✕</button>
              </div>
            )}

            {/* Reply preview (when replyingTo is set) */}
            {replyingTo && (
              <div style={{ position: 'absolute', left: 64, right: 120, bottom: replyBottom, background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 12, padding: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 12, color: th.txt3, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replyingTo.author ? `${replyingTo.author}: ` : ''}{replyingTo.content}</div>
                <button onClick={() => setReplyingTo(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: th.txt3 }}>✕</button>
              </div>
            )}

            {pendingAttachment && !uploadingAttachment && (
              <div style={{ position: 'absolute', left: 64, right: 120, bottom: attachBottom, background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 12, padding: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
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
                <div style={{ position: 'absolute', bottom: 44, left: 0, width: 280, background: th.surf, border: `1px solid ${th.bdr}`, borderRadius: 12, padding: 12, boxShadow: '0 12px 36px rgba(2,6,23,0.12)', zIndex: 80, backdropFilter: th.blur, WebkitBackdropFilter: th.blur }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 6, background: '#ef4444', boxShadow: '0 0 8px rgba(239,68,68,0.6)', }} />
                    <div style={{ fontWeight: 700, fontSize: 13 }}>Recording…</div>
                    <canvas ref={canvasRef} width={80} height={20} style={{ flex: 1, maxHeight: 20, minWidth: 60 }} />
                    <div style={{ fontSize: 12, color: th.txt3 }}>{Math.floor(recordSecs / 60).toString().padStart(2, '0')}:{(recordSecs % 60).toString().padStart(2, '0')}</div>
                    <button onClick={(e) => { e.stopPropagation(); stopRecording(); }} style={{ marginLeft: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: th.txt, fontSize: 13, fontWeight: 600 }}>
                      Stop
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
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
                  width: '100%',
                  borderRadius: 14,
                  border: `1px solid ${th.inpB}`,
                  background: th.inp,
                  color: th.txt,
                  padding: '11px 40px 11px 14px',
                  outline: 'none',
                  fontSize: 14,
                  fontFamily: 'inherit',
                }}
                data-testid="input-message"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowComposerEmojiPicker(v => !v);
                  setShowAttachMenu(false);
                  setShowStickerPicker(false);
                }}
                title="Add Emoji"
                style={{
                  position: 'absolute',
                  right: 12,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: th.txt3,
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Smile size={18} />
              </button>

              {/* Composer Emoji Picker Panel */}
              {showComposerEmojiPicker && (
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    bottom: 48,
                    right: 0,
                    width: 320,
                    height: 240,
                    background: th.surf,
                    border: `1px solid ${th.bdr}`,
                    borderRadius: 16,
                    padding: 12,
                    boxShadow: '0 12px 36px rgba(2,6,23,0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 90,
                    backdropFilter: th.blur,
                    WebkitBackdropFilter: th.blur,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottom: `1px solid ${th.bdr}`, paddingBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: th.txt2 }}>Emojis</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowComposerEmojiPicker(false);
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: th.txt3, fontSize: 12 }}
                    >
                      Close
                    </button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
                    {ALL_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setText(prev => prev + emoji);
                        }}
                        style={{
                          fontSize: 20,
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 4,
                          borderRadius: 8,
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = dk ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

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
              disabled={(!text.trim() && !pendingAudioName && !pendingAttachment && !isRecording) || sending || uploadingAttachment || !isAligned}
              title={!isAligned ? 'You must be aligned with this user to send messages' : ''}
              style={{
                borderRadius: 14,
                border: 'none',
                background: ((text.trim() || pendingAudioName || pendingAttachment || isRecording) && isAligned) ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : (dk ? 'rgba(255,255,255,0.07)' : '#f1f5f9'),
                color: ((text.trim() || pendingAudioName || pendingAttachment || isRecording) && isAligned) ? '#fff' : th.txt3,
                padding: '11px 16px',
                cursor: ((text.trim() || pendingAudioName || pendingAttachment || isRecording) && isAligned) ? 'pointer' : 'default',
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
        );
      })()}
    </div>
  );
}
