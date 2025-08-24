async function sendMessage() {
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

    // If backend failed, show the message it returned
    if (!res.ok) {
      let errMsg = `Server error (${res.status})`;
      try {
        const body = await res.json();
        if (body?.message) errMsg = body.message;
      } catch {}
      setMessages([...newMessages, { role: "assistant", content: `❌ ${errMsg}` }]);
      return;
    }

    const data = await res.json();
    const reply = data?.reply || "I couldn’t generate a reply 😅";
    setMessages([...newMessages, { role: "assistant", content: reply }]);
  } catch (err) {
    setMessages([...newMessages, { role: "assistant", content: "❌ Network error" }]);
  } finally {
    setLoading(false);
  }
}
