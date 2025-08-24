import { useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi 👋 I’m your College AI. Ask me anything!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages([...newMessages, { role: "assistant", content: "❌ Error connecting to AI" }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto", fontFamily: "Arial" }}>
      <h1>🎓 College AI Chatbot</h1>
      <div style={{ border: "1px solid #ccc", padding: "10px", height: "400px", overflowY: "scroll" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ margin: "10px 0" }}>
            <b>{m.role === "user" ? "You" : "AI"}:</b> {m.content}
          </div>
        ))}
        {loading && <div>⏳ AI is thinking...</div>}
      </div>
      <div style={{ marginTop: "10px", display: "flex" }}>
        <input
          style={{ flex: 1, padding: "10px" }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question..."
        />
        <button onClick={sendMessage} style={{ padding: "10px" }}>Send</button>
      </div>
    </div>
  );
}
