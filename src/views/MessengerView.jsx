import { useEffect, useMemo, useState } from "react";
import { Send, MessageSquare, Search, ArrowLeft } from "lucide-react";
import { T } from "../config/constants.js";
import Av from "../components/ui/Av.jsx";
import Card from "../components/ui/Card.jsx";

const initialThreads = [
  { id: "thread-1", name: "Product feedback", messages: [{ user: "system", text: "Welcome to the RightSignal messenger." }] },
  { id: "thread-2", name: "Founder introductions", messages: [{ user: "system", text: "Start a conversation with the community." }] },
];

export default function MessengerView({ dk, profiles, me, initUid, onProfile }) {
  const th = T(dk);
  const [threads, setThreads] = useState(initialThreads);
  const [active, setActive] = useState(initialThreads[0].id);
  const [text, setText] = useState("");

  const current = useMemo(() => threads.find(thread => thread.id === active) || threads[0], [threads, active]);

  useEffect(() => {
    if (initUid && profiles[initUid]) {
      const threadId = `chat-${initUid}`;
      if (!threads.some(thread => thread.id === threadId)) {
        setThreads(prev => [{ id: threadId, name: profiles[initUid].name || "Contact", messages: [{ user: initUid, text: "Let’s connect." }], target: initUid }, ...prev]);
      }
      setActive(threadId);
    }
  }, [initUid, profiles]);

  const sendMessage = () => {
    if (!text.trim()) return;
    setThreads(prev => prev.map(thread => thread.id === active ? { ...thread, messages: [...thread.messages, { user: me, text: text.trim() }] } : thread));
    setText("");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 18, minHeight: "100vh" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 22, color: th.txt }}>Messages</h2>
          <Search size={20} color={th.txt3} />
        </div>
        <Card dk={dk} style={{ padding: 0, overflow: "hidden" }}>
          {threads.map(thread => (
            <button key={thread.id} onClick={() => setActive(thread.id)} style={{ width: "100%", textAlign: "left", border: "none", padding: 16, background: thread.id === active ? "rgba(59,130,246,.1)" : "transparent", color: th.txt, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <Av profile={profiles[thread.target] || { name: thread.name }} size={36} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{thread.name}</div>
                <div style={{ fontSize: 12, color: th.txt3 }}>{thread.messages[thread.messages.length - 1]?.text}</div>
              </div>
            </button>
          ))}
        </Card>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => onProfile(current.target)} style={{ border: "none", background: "transparent", cursor: "pointer", color: th.txt3 }}><ArrowLeft size={18} /></button>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: th.txt }}>{current.name}</div>
              <div style={{ fontSize: 12, color: th.txt3 }}>Last message: {current.messages[current.messages.length - 1]?.text}</div>
            </div>
          </div>
          <MessageSquare size={20} color={th.txt3} />
        </div>

        <Card dk={dk} style={{ minHeight: 480, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ overflowY: "auto", paddingRight: 4, maxHeight: 420 }}>
            {current.messages.map((message, index) => {
              const fromMe = message.user === me;
              return (
                <div key={index} style={{ display: "flex", justifyContent: fromMe ? "flex-end" : "flex-start", marginBottom: 12 }}>
                  <div style={{ maxWidth: "72%", padding: 14, borderRadius: 18, background: fromMe ? "#3b82f6" : th.surf, color: fromMe ? "#fff" : th.txt, boxShadow: "0 10px 24px rgba(0,0,0,.06)" }}>
                    {message.text}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <input value={text} onChange={e => setText(e.target.value)} placeholder="Type a message" style={{ flex: 1, borderRadius: 14, border: `1px solid ${th.inpB}`, background: th.inp, color: th.txt, padding: "12px 14px", outline: "none" }} />
            <button onClick={sendMessage} style={{ borderRadius: 14, border: "none", background: "#3b82f6", color: "#fff", padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}><Send size={16} />Send</button>
          </div>
        </Card>
      </div>
    </div>
  );
}
