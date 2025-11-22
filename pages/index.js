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

  async function sendMessage() {
    if (!input.trim()) return;
    const question = input.trim();
    const newMessages = [...messages, { role: "user", content: question, ts: Date.now() }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // 1) Try the local JSON college API
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
        } catch (e) {
          collegeReply = "";
        }
      }

      if (collegeReply) {
        setMessages([...newMessages, { role: "assistant", content: collegeReply, meta: { source: "db" }, ts: Date.now() }]);
        setLoading(false);
        return;
      }

      // 2) Fallback to existing /api/chat (LLM)
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
        setMessages([...newMessages, { role: "assistant", content: `❌ ${errMsg}`, meta: { source: "llm" }, ts: Date.now() }]);
        setLoading(false);
        return;
      }

      const a2 = await r2.json();
      const reply = a2?.reply || "I couldn’t generate a reply 😅";
      setMessages([...newMessages, { role: "assistant", content: reply, meta: { source: "llm" }, ts: Date.now() }]);
    } catch (err) {
      setMessages([...newMessages, { role: "assistant", content: "❌ Network error", meta: { source: "error" }, ts: Date.now() }]);
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
    <div className="chat-wrapper">
      <div className="chat-card">
        {/* Header */}
        <div className="px-6 py-4 border-b" style={{ borderColor: "#eef2f7" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#6d28d9", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                🎓
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>CollegeGPT — HSIT</div>
                <div style={{ fontSize: 13, color: "#64748b" }}>Ask anything about the college — placements, faculty, admissions & more</div>
              </div>
            </div>
            <div style={{ color: "#10b981", fontWeight: 600 }}>Live</div>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{ height: "60vh", overflowY: "auto", padding: 16 }}>
          {messages.map((m, i) => {
            const isUser = m.role === "user";
            return (
              <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 14 }}>
                <div style={{ textAlign: isUser ? "right" : "left" }}>
                  <div className={isUser ? "bubble-user" : "bubble-assistant"}>
                    {m.content}
                  </div>
                  <div className="msg-meta">{m.ts ? prettyTime(m.ts) : ""}</div>
                </div>
              </div>
            );
          })}
          {loading && (
            <div style={{ marginBottom: 10 }}>
              <div className="bubble-assistant" style={{ width: 150, opacity: 0.7 }}>Thinking…</div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: 12, borderTop: "1px solid #eef2f7" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input-field"
              placeholder="Type your question… (e.g., placements 2024-25)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={loading}
            />
            <button className="send-btn" onClick={sendMessage} disabled={loading}>
              {loading ? "Sending..." : "Send"}
            </button>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["CSE faculty list", "HSIT address", "placements 2024-25", "Manjaragi email"].map((c) => (
              <button key={c} className="chip" onClick={() => setInput(c)} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #eef2f7", background: "#fff" }}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 12, color: "#94a3b8" }}>Built with ♥ by HSIT students</div>
    </div>
  );
}