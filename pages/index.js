import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    { 
  role: "assistant", 
  content: "Hello! 👋 This is CollegeGPT — developed by HSIT College students. You can ask anything related to our college such as faculty details, fees, admission process, placements, facilities, and even general questions!" 
},

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  async function sendMessage() {
    if (!input.trim()) return;
    const question = input;
    const newMessages = [...messages, { role: "user", content: question }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // 1) Try college-specific API (Supabase-backed)
      const r1 = await fetch("/api/college", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      let collegeReply = "";
      try {
        const a1 = await r1.json();
        collegeReply = a1?.reply || (a1?.ok && a1?.answer) || "";
      } catch {}

      if (collegeReply) {
        setMessages([...newMessages, { role: "assistant", content: collegeReply }]);
        return;
      }

      // 2) Fallback to general chat (Gemini/OpenAI) via /api/chat
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h1 className="text-xl font-semibold text-indigo-600">🎓 College AI Chatbot</h1>
          <p className="text-sm text-gray-500 mt-1">Ask anything about your college — placements, faculty, exams & more.</p>
        </div>

        <div
          ref={scrollRef}
          className="h-[60vh] overflow-y-auto p-6 space-y-4 bg-white"
          aria-live="polite"
        >
          {messages.map((m, i) => {
            const isUser = m.role === "user";
            return (
              <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-4 py-3 rounded-lg ${isUser ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-900"}`}>
                  <div className="text-sm">{m.content}</div>
                  <div className="text-[10px] mt-1 text-opacity-60 text-white/80">
                    {isUser ? "You" : "AI"}
                  </div>
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-lg bg-gray-100 text-gray-700">⏳ AI is thinking…</div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-white flex gap-3 items-center">
          <input
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question… (e.g., placements 2024-25)"
            onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage()}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className={`px-5 py-2 rounded-lg font-medium text-white ${loading ? "bg-indigo-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"}`}
          >
            {loading ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
