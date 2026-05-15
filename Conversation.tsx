import { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabase"; // Adjust path if needed
import { useAuth } from "../context/AuthContext"; // Adjust path if needed

// Add this type definition near the top of your file
type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export default function Conversation({
  chat,
  onBack,
}: {
  chat: any;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch initial messages when the chat opens
  useEffect(() => {
    if (!chat?.id) return;

    const fetchMessages = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", chat.id)
        .order("created_at", { ascending: true });

      if (error) console.error("Error fetching messages:", error);
      else setMessages(data || []);

      setIsLoading(false);
      scrollToBottom();
    };

    fetchMessages();
  }, [chat?.id]);

  // 2. Realtime Listener: Listen for NEW messages hitting the database
  useEffect(() => {
    if (!chat?.id) return;

    const messageSubscription = supabase
      .channel(`public:messages:convo-${chat.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${chat.id}`,
        },
        (payload) => {
          // Instantly add the new message to the screen
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          scrollToBottom();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageSubscription);
    };
  }, [chat?.id]);

  // Auto-scroll helper
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // 3. Send Message Logic
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !user) return;

    const messageContent = newMessageText;
    setNewMessageText(""); // Clear input instantly for better UX

    // A. Insert the new message
    const { error: messageError } = await supabase.from("messages").insert([
      {
        conversation_id: chat.id,
        sender_id: user.id,
        content: messageContent,
      },
    ]);

    if (messageError) {
      console.error("Error sending message:", messageError);
      return;
    }

    // B. Update the "last_message" and "updated_at" on the conversation
    // (This ensures the Messages.tsx list moves this chat to the top)
    await supabase
      .from("conversations")
      .update({
        last_message: messageContent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", chat.id);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center gap-4">
        <button onClick={onBack} className="text-gray-400 hover:text-white">
          ← Back
        </button>
        <h2 className="text-white font-bold">{chat.sender}</h2>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <p className="text-gray-500 text-center">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-gray-500 text-center">No messages yet. Say hi!</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`px-4 py-2 rounded-2xl max-w-[70%] ${
                    isMe
                      ? "bg-brand text-brand-contrast rounded-tr-none"
                      : "bg-gray-800 text-white rounded-tl-none"
                  }`}
                >
                  <p>{msg.content}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} /> {/* Invisible div for auto-scrolling */}
      </div>

      {/* Input Box */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t border-gray-800 flex gap-2"
      >
        <input
          type="text"
          value={newMessageText}
          onChange={(e) => setNewMessageText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-full px-4 py-2 focus:outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={!newMessageText.trim()}
          className="bg-brand text-brand-contrast px-6 py-2 rounded-full font-bold disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
