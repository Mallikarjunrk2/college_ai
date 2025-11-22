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
    const newMessages = [
      ...messages,
      { role: "user", content: question, ts: Date.now() },
    ];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // Try JSON college API first
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
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: collegeReply,
            meta: { source: "db" },
            ts: Date.now(),
          },
        ]);
        setLoading(false);
        return;
      }

      // Fallback to Gemini LLM
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
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: `❌ ${errMsg}`,
            meta: { source: "llm" },
            ts: Date.now(),
          },
        ]);
        setLoading(false);
        return;
      }

      const a2 = await r2.json();
      const reply = a2?.reply || "I couldn’t generate a reply 😅";

      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: reply,
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

  function t(ts) {
    try {
      return new Date(ts).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 flex justify-center">
      <div className="w-full max-w-3xl">

        {/* HEADER */}
        <div className="bg-white rounded-xl border shadow-sm p-5 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-2xl">
              🎓
            </div>
            <div>
              <div className="text-xl font-bold text-gray-800">CollegeGPT — HSIT</div>
              <div className="text-sm text-gray-500">
                Ask anything about the college — placements, faculty, admissions & more
              </div>
            </div>
          </div>
          <span className="text-green-600 font-medium text-sm">● Live</span>
        </div>

        {/* MESSAGES */}
        <div
          ref={scrollRef}
          className="bg-white h-[62vh] rounded-xl border p-4 overflow-y-auto space-y-4"
        >
          {messages.map((m, i) => {
            const isUser = m.role === "user";
            return (
              <div
                key={i}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div>
                  <div
                    className={`${
                      isUser
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-800"
                    } px-4 py-3 rounded-xl max-w-[80%]`}
                  >
                    {m.content}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {t(m.ts)}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-600 px-4 py-3 rounded-xl">
                Typing…
              </div>
            </div>
          )}
        </div>

        {/* INPUT BOX */}
        <div className="mt-4 bg-white rounded-xl border p-4 flex gap-3">
          <input
            className="flex-1 px-4 py-3 border rounded-xl bg-gray-50"
            placeholder="Type your question…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl"
          >
            Send
          </button>
        </div>

      </div>
    </div>
  );
}