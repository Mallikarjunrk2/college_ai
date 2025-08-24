import { useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi 👋 I’m your College AI. Ask me anything!" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim()) return;

    const question = input;
    const newMessages = [...messages, { role: "user", content: question }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // 1) Try our college API (Supabase intents)
      const r1 = await fetch("/api/college", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      let collegeReply = "";
      try {
        const a1 = await r1.json();
        collegeReply = a1?.reply || (a1?.ok && a1?.answer) || "";
      } catch {
        // ignore parse issues; we'll fall back
      }

      if (collegeReply) {
        setMessages([...newMessages, { role: "assistant", content: collegeReply }]);
        return;
      }

      // 2) Fallback to Gemini
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
        setMessages([...newMessages, { role: "assistant", content: `❌ ${errMsg}` }]);
        return;
      }

      const a2 = await r2.json();
      const reply = a2?.reply || "I couldn’t generate a reply 😅";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "❌ Network error" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "40px auto", fontFamily: "Arial, sans-serif" }}>
      <h1>🎓 College AI Chatbot</h1>

      <div style={{ border: "1px solid #ccc", padding: 12, height: 420, overflowY: "auto" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ margin: "10px 0" }}>
            <b>{m.role === "user" ? "You" : "AI"}:</b> {m.content}
          </div>
        ))}
        {loading && <div>⏳ AI is thinking…</div>}
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <input
          style={{ flex: 1, padding: 10 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question… (e.g., placements 2024-25)"
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage} style={{ padding: "10px 16px" }}>Send</button>
      </div>
    </div>
  );
}
