import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { T } from '../../config/constants.js';
import { db } from '../../services/supabase.js';
import Av from '../ui/Av.jsx';

interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface Profile {
  name?: string;
  avatar?: string;
  hue?: string;
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastIdRef = useRef<string | null>(null);

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
    fetchMessages(true).finally(() => setLoading(false));

    pollRef.current = setInterval(() => fetchMessages(false), 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [conversationId, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);

    const tempId = `temp_${Date.now()}`;
    const temp: Message = {
      id: tempId,
      conversation_id: conversationId,
      user_id: me,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, temp]);

    const saved: Message | null = await db.post('rs_conversation_messages', {
      conversation_id: conversationId,
      user_id: me,
      content,
    });

    if (saved) {
      setMessages(prev => prev.map(m => m.id === tempId ? saved : m));
      lastIdRef.current = saved.id;
      db.patch('rs_conversations', `id=eq.${conversationId}`, { updated_at: new Date().toISOString() });
    } else {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setText(content);
    }
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 460 }}>
      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 4px 8px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                  <div
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
                    }}
                  >
                    {msg.content}
                  </div>
                  {!prevSame && (
                    <span style={{ fontSize: 10, color: th.txt3, marginTop: 3, paddingLeft: 2, paddingRight: 2 }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })
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
          marginTop: 4,
        }}
      >
        <input
          value={text}
          onChange={e => setText(e.target.value)}
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
          onClick={sendMessage}
          disabled={!text.trim() || sending}
          style={{
            borderRadius: 14,
            border: 'none',
            background: text.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : (dk ? 'rgba(255,255,255,0.07)' : '#f1f5f9'),
            color: text.trim() ? '#fff' : th.txt3,
            padding: '11px 16px',
            cursor: text.trim() ? 'pointer' : 'default',
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
