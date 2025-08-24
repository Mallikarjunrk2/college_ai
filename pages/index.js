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
    const question = input;
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // 1) Ask our college API (Supabase intents)
      const r1 = await fetch("/api/college", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });

      // We accept either {reply} or {ok:true, answer: "..."}
      let aiReply = "";
      try {
        const a1 = await r1.json();
        aiReply = a1?.reply || (a1?.ok && a1?.answer) || "";
      } catch (_) {
        /* ignore JSON parse issues and just fall back */
      }

      if (aiReply) {
        setMessages([...newMessages, { role: "assistant", content: aiReply }]);
        return;
      }

      // 2) Fallback to Gemini (/api/chat)
      const r2 = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!r2.ok) {
        let errMsg = `Server error (${r2.status})`;
        try { const body = await r2.json(); if (body?.message) errMsg = body.message; } catch {}
        setMessages([...newMessages, { role: "assistant", content: `❌ ${errMsg}` }]);
        return;
      }

      const a2 = await r2.json(
::contentReference[oaicite:0]{index=0}
