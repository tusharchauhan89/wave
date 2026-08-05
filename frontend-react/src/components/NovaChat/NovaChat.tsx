import { useEffect, useRef, useState } from "react";
import { X, Send, Sparkles } from "lucide-react";
import { getChatStatus, sendChatMessage, type ChatMessage } from "../../services/chat";
import { usePlayer } from "../../context/PlayerContext";
import { searchMusic } from "../../services/music";
import "./NovaChat.css";

interface NovaChatProps {
  open: boolean;
  onClose: () => void;
}

const MOODS = [
  { label: "😢 Sad", text: "play sad songs" },
  { label: "🎉 Party", text: "play party songs" },
  { label: "🌙 Lofi", text: "play lofi chill beats" },
  { label: "❤️ Romantic", text: "play romantic songs" },
  { label: "💪 Gym", text: "play gym workout songs" },
  { label: "🌧️ Rainy", text: "play rainy day songs" },
  { label: "🧘 Focus", text: "play focus study music" },
  { label: "🔥 Hindi Hits", text: "play trending hindi songs" },
];

function NovaChat({ open, onClose }: NovaChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hey! I'm Nova(Grove-AI)🎵 — your music companion.Tell me what you want to hear, or simply describe the vibe.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [providerLabel, setProviderLabel] = useState("Checking…");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { playSong } = usePlayer();

  useEffect(() => {
    if (!open) return;

    getChatStatus()
      .then((res) => {
        if (res.smart) {
          setProviderLabel(`AI · ${res.provider || "grove"}`);
        } else {
          setProviderLabel("Offline · no API key");
        }
      })
      .catch(() => setProviderLabel("Offline · API unreachable"));
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const runAction = async (action?: string | null, query?: string | null) => {
    if (!action) return;

    try {
      if (action === "play_search" && query) {
        const results = await searchMusic(query, 10);
        const songs = Array.isArray(results) ? results : [];
        if (songs.length > 0) {
          await playSong(songs[0], songs);
        }
      }

      if (action === "search" && query) {
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
      }
    } catch (err) {
      console.error("Chat action failed:", err);
    }
  };

  const handleSend = async (customText?: string) => {
    const text = (customText ?? input).trim();
    if (!text || sending) return;

    if (!customText) setInput("");
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const data = await sendChatMessage(text, [...messages, userMsg]);
      const reply = data.reply || "Hmm, I couldn't reply.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      await runAction(data.action, data.query);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error: " + (err?.message || "chat failed"),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="nova-chat-panel">
      <div className="nova-chat-header">
        <div className="nova-chat-title">
          <Sparkles size={18} />
          <div>
            <strong>Nova</strong>
            <small>{providerLabel}</small>
          </div>
        </div>
        <button className="nova-chat-close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {/* Mood chips */}
      <div className="nova-moods">
        {MOODS.map((mood) => (
          <button
            key={mood.label}
            className="nova-mood-chip"
            onClick={() => handleSend(mood.text)}
            disabled={sending}
          >
            {mood.label}
          </button>
        ))}
      </div>

      <div className="nova-chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`nova-bubble ${m.role}`}>
            {m.content}
          </div>
        ))}
        {sending && (
          <div className="nova-bubble assistant typing">💿 Digging through the crates...</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="nova-chat-input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask Nova… play a song, mood, etc."
        />
        <button onClick={() => handleSend()} disabled={sending || !input.trim()}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

export default NovaChat;