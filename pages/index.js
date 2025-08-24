import { useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi 👋 I’m your College AI. Ask me anything!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/college", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ question: input }),   // we only send the question text
});


      if (!res.ok) {
        let errMsg = `Server error (${res.status})`;
        try { const body = await res.json(); if (body?.message) errMsg = body.message; } catch {}
        setMessages([...newMessages, { role: "assistant", content: `❌ ${errMsg}` }]);
        return;
      }

      const data = await res.json();
      const reply = data?.reply || "I couldn’t generate a reply 😅";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "❌ Network error" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", fontFamily: "Arial" }}>
      <h1>🎓 College AI Chatbot</h1>
      <div style={{ border: "1px solid #ccc", padding: 10, height: 400, overflowY: "auto" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ margin: "10px 0" }}>
            <b>{m.role === "user" ? "You" : "AI"}:</b> {m.content}
          </div>
        ))}
        {loading && <div>⏳ AI is thinking...</div>}
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <input
          style={{ flex: 1, padding: 10 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage} style={{ padding: 10 }}>Send</button>
      </div>
    </div>
  );
}
