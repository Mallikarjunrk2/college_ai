// pages/index.js
import { useEffect, useRef, useState } from "react";

export default function Home() {
  // initial messages (assistant welcome kept)
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
    // auto-scroll to bottom on new message
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function sendMessage() {
    if (!input.trim()) return;
    const question = input.trim();
    const newMessages = [...messages, { role: "user", content: question, ts: Date.now() }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // 1) try local college DB JSON API
      const r1 = await fetch("/api/college_local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const a1 = await r1.json();
      const collegeReply = a1?.reply || "";

      if (collegeReply) {
        setMessages(prev => [
          ...newMessages,
          { role: "assistant", content: collegeReply, meta: { source: "db" }, ts: Date.now() },
        ]);
        setLoading(false);
        return;
      }

      // 2) fallback to LLM (your existing /api/chat)
      const r2 = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!r2.ok) {
        let errMsg = `Server error (${r2.status})`;
        try {
          const body = await r2.json();
          if (body?.message) errMsg = body.message;
        } catch {}
        setMessages(prev => [
          ...newMessages,
          { role: "assistant", content: `❌ ${errMsg}`, meta: { source: "llm" }, ts: Date.now() },
        ]);
        setLoading(false);
        return;
      }
      const a2 = await r2.json();
      const reply = a2?.reply || "I couldn’t generate a reply 😅";
      setMessages(prev => [...newMessages, { role: "assistant", content: reply, meta: { source: "llm" }, ts: Date.now() }]);
    } catch (e) {
      setMessages(prev => [...newMessages, { role: "assistant", content: "❌ Network error", meta: { source: "error" }, ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  }

  function prettyTime(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "linear-gradient(180deg,#071022,#081426)" }}>
      <div className="w-full max-w-3xl">
        {/* Card */}
        <div className="app-card">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.03)" }}>
            <div className="flex items-center gap-3">
              <div className="brand-badge">🎓</div>
              <div>
                <div className="text-lg font-semibold" style={{ color: "#e6edf3" }}>CollegeGPT — HSIT</div>
                <div className="text-sm" style={{ color: "rgba(230,237,243,0.65)" }}>Ask anything about the college — placements, faculty, admissions & more</div>
              </div>
            </div>
            <div className="text-sm" style={{ color: "rgba(230,237,243,0.55)" }}>Status: <span style={{ color: "#34d399" }}>Live</span></div>
          </div>

          {/* Messages area */}
          <div ref={scrollRef} className="messages-area h-[60vh] md:h-[68vh] overflow-y-auto px-6 py-6 space-y-4">
            {messages.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div className={`${isUser ? "items-end text-right" : "items-start text-left"} max-w-[85%]`}>
                    {/* bubble */}
                    <div className={`${isUser ? "msg-user" : "msg-assistant"} inline-block shadow-sm`}>
                      {/* content */}
                      <div className="prose prose-sm max-w-none" style={{ color: isUser ? "#fff" : "#e6edf3" }}>
                        {m.content}
                      </div>
                      {/* meta row */}
                      <div className={`mt-2 msg-meta flex items-center gap-2 justify-between`}>
                        <span>{m.ts ? prettyTime(m.ts) : ""}</span>
                        <span className="ml-3 px-2 py-0.5 rounded-full text-xs hidden sm:inline" style={{ background: "rgba(255,255,255,0.02)", color: "rgba(230,237,243,0.7)" }}>
                          {m.meta?.source === "db" ? "DB" : m.meta?.source === "llm" ? "LLM" : m.meta?.source === "error" ? "ERR" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="msg-assistant animate-pulse w-1/3">
                  <div className="h-3 bg-white/10 rounded mb-2"></div>
                  <div className="h-3 bg-white/8 rounded w-3/4"></div>
                </div>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div className="p-4 border-t bg-transparent" style={{ borderTop: "1px solid rgba(255,255,255,0.03)" }}>
            <div className="max-w-full mx-auto flex gap-3 items-center">
              <input
                aria-label="Type your question"
                className="chat-input flex-1"
                placeholder="Type your question… (e.g., placements 2024-25)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading}
                className="send-btn ml-2"
              >
                {loading ? "Sending..." : "Send"}
              </button>
            </div>

            {/* small quick chips */}
            <div className="mt-3 flex gap-2 flex-wrap">
              {["CSE faculty list", "HSIT address", "placements 2024-25", "Manjaragi sir email"].map((c) => (
                <button key={c} onClick={() => { setInput(c); }} className="chip">
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* footer small */}
        <div className="mt-4 text-center text-xs" style={{ color: "rgba(230,237,243,0.45)" }}>
          Built with ♥ by HSIT students — data-first answers from local DB
        </div>
      </div>
    </div>
  );
}