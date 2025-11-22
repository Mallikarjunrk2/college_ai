// pages/index.js
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi 👋 I’m your CollegeGPT (HSIT). Ask anything about the college , placements, faculty, admissions, and more.",
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

  async function sendMessage() {
    if (!input.trim()) return;
    const question = input.trim();
    const newMessages = [...messages, { role: "user", content: question, ts: Date.now() }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // 1) try local college JSON / DB endpoint
      const r1 = await fetch("/api/college_local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      let collegeReply = "";
      if (r1.ok) {
        try {
          const a1 = await r1.json();
          collegeReply = a1?.reply || "";
        } catch {}
      }

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
          const b = await r2.json();
          if (b?.message) errMsg = b.message;
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
      setMessages(prev => [
        ...newMessages,
        { role: "assistant", content: reply, meta: { source: "llm" }, ts: Date.now() },
      ]);
    } catch (e) {
      setMessages(prev => [
        ...newMessages,
        { role: "assistant", content: "❌ Network error", meta: { source: "error" }, ts: Date.now() },
      ]);
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
    <div className="min-h-screen flex items-start justify-center py-8 px-4">
      <div className="w-full max-w-3xl">
        {/* Header card (dark glass) */}
        <div className="bg-glass card-glow rounded-2xl p-5 flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(180deg,#5b21b6,#4f46e5)" }}>
              <span style={{ fontSize: 22 }}>🎓</span>
            </div>
            <div>
              <div className="text-2xl font-semibold header-title" style={{ color: "#e8eefb" }}>CollegeGPT — HSIT</div>
              <div className="text-sm header-sub" style={{ color: "rgba(255,255,255,0.65)" }}>
                Ask anything about the college — placements, faculty, admissions & more
              </div>
            </div>
          </div>
          <div className="text-sm" style={{ color: "#10b981" }}>
            Status: <span style={{ color: "#34d399", fontWeight: 600 }}>Live</span>
          </div>
        </div>

        {/* Chat container */}
        <div className="bg-glass rounded-2xl p-4 overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.03)" }}>
          <div ref={scrollRef} className="h-[62vh] overflow-y-auto px-3 py-4 space-y-4">
            {messages.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div className={`${isUser ? "items-end text-right" : "items-start text-left"} max-w-[85%]`}>
                    <div className={`${isUser ? "msg-user" : "msg-assistant"} inline-block p-4 rounded-2xl shadow-sm whitespace-pre-wrap break-words`}>
                      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5, fontSize: 15 }}>
                        {m.content}
                      </div>
                      <div className="mt-2 text-[11px] flex items-center justify-between" style={{ color: isUser ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.6)" }}>
                        <span>{m.ts ? prettyTime(m.ts) : ""}</span>
                        <span className="ml-2 text-xs" style={{ background: "rgba(255,255,255,0.02)", padding: "2px 8px", borderRadius: 999 }}>
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
                <div className="msg-assistant inline-block p-4 rounded-2xl w-1/3 animate-pulse">
                  <div style={{ height: 10, background: "rgba(255,255,255,0.03)", borderRadius: 6, marginBottom: 8 }} />
                  <div style={{ height: 10, background: "rgba(255,255,255,0.02)", borderRadius: 6, width: "70%" }} />
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="mt-4 bg-transparent pt-3 border-t border-white/5">
            <div className="flex gap-3 items-center">
              <input
                aria-label="Type your question"
                className="input-glass rounded-xl flex-1 px-4 py-3 text-white placeholder:text-gray-300"
                placeholder="Type your question… (e.g., placements 2024-25)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={loading}
                style={{ color: "#eef6ff" }}
              />
              <button
                onClick={sendMessage}
                disabled={loading}
                className="btn-accent rounded-xl px-5 py-3 text-white font-medium"
              >
                {loading ? "Sending..." : "Send"}
              </button>
            </div>

            <div className="mt-3 flex gap-2 flex-wrap quick-chips">
              {["CSE faculty list", "HSIT address", "placements 2024-25", "Manjaragi email"].map((c) => (
                <button key={c} onClick={() => setInput(c)} className="px-3 py-1 rounded-full text-sm">
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          Built with ♥ by HSIT students — data-first answers from local DB
        </div>
      </div>
    </div>
  );
}