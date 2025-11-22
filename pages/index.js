// pages/index.js
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi 👋 I’m your CollegeGPT (HSIT). Ask anything about the college — placements, faculty, admissions, and more.",
      meta: { source: "db" },
      ts: Date.now(),
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  function prettyTime(ts) {
    try {
      return new Date(ts).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  async function sendMessage() {
    if (!input.trim()) return;
    const question = input.trim();

    const newMessages = [
      ...messages,
      { role: "user", content: question, ts: Date.now() },
    ];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // 1) Try local DB JSON (college_local)
      const r1 = await fetch("/api/college_local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const a1 = await r1.json();
      const replyDb = a1?.reply || "";

      if (replyDb) {
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: replyDb,
            meta: { source: "db" },
            ts: Date.now(),
          },
        ]);
        setLoading(false);
        return;
      }

      // 2) Fallback to LLM
      const r2 = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const a2 = await r2.json();
      const llmReply = a2?.reply || "I couldn’t generate a reply 😅";

      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: llmReply,
          meta: { source: "llm" },
          ts: Date.now(),
        },
      ]);
    } catch (err) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "❌ Network error",
          meta: { source: "error" },
          ts: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white text-lg font-semibold">
                🎓
              </div>
              <div>
                <div className="text-lg font-semibold text-indigo-700">
                  CollegeGPT — HSIT
                </div>
                <div className="text-sm text-gray-500">
                  Ask anything about the college — placements, faculty, admissions & more
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-400">
              Status: <span className="text-green-500">Live</span>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="h-[60vh] md:h-[68vh] overflow-y-auto px-6 py-6 space-y-4 bg-gradient-to-b from-white to-gray-50"
          >
            {messages.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] ${isUser ? "text-right" : "text-left"}`}>

                    {/* BUBBLE — using brand CSS */}
                    <div
                      className={`inline-block p-4 whitespace-pre-wrap break-words shadow-sm ${
                        isUser ? "msg-user text-white" : "msg-assistant text-gray-800"
                      }`}
                      style={{ maxWidth: "100%" }}
                    >
                      {/* Content */}
                      <div className="prose prose-sm max-w-none">{m.content}</div>

                      {/* Meta */}
                      <div
                        className={`mt-2 text-[11px] ${
                          isUser ? "text-white/90" : "text-gray-500"
                        } flex items-center gap-2 justify-between`}
                      >
                        <span>{prettyTime(m.ts)}</span>

                        {/* Source tag */}
                        <span
                          className="ml-3 px-2 py-0.5 rounded-full text-xs hidden sm:inline"
                          style={{
                            background: isUser
                              ? "rgba(255,255,255,0.08)"
                              : "transparent",
                            color: isUser
                              ? "rgba(255,255,255,0.9)"
                              : "rgba(55,65,81,0.9)",
                          }}
                        >
                          {m.meta?.source === "db"
                            ? "DB"
                            : m.meta?.source === "llm"
                            ? "LLM"
                            : ""}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-700 rounded-tl-2xl rounded-br-2xl rounded-tr-xl p-4 animate-pulse w-1/3">
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div className="p-4 border-t bg-white sticky bottom-0">
            <div className="max-w-full mx-auto flex gap-3 items-center">
              <input
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 placeholder-gray-400"
                placeholder="Type your question… (e.g., placements 2024-25)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={loading}
              />

              <button
                onClick={sendMessage}
                disabled={loading}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 font-medium shadow"
              >
                {loading ? "Sending..." : "Send"}
              </button>
            </div>

            {/* Quick chips */}
            <div className="mt-3 flex gap-2 flex-wrap">
              {["CSE faculty list", "HSIT address", "placements 2024-25", "Manjaragi sir email"].map(
                (c) => (
                  <button
                    key={c}
                    onClick={() => setInput(c)}
                    className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100"
                  >
                    {c}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-gray-400">
          Built with ♥ by HSIT students — data-first answers from local DB
        </div>
      </div>
    </div>
  );
}