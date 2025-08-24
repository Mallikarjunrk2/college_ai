export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ message: "Missing GEMINI_API_KEY" });

  const { messages = [] } = req.body || {};
  const modelURL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

  // Build Gemini payload from our chat history
  const payload = {
    contents: messages.map(m => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }))
  };

  async function callWithHeader() {
    return fetch(modelURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY
      },
      body: JSON.stringify(payload)
    });
  }

  async function callWithQueryParam() {
    return fetch(`${modelURL}?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  try {
    // Try header auth first
    let r = await callWithHeader();
    if (!r.ok) {
      const t = await r.text();
      console.error("Gemini error (header auth):", r.status, t);
      // Retry with query-param auth
      r = await callWithQueryParam();
      if (!r.ok) {
        const t2 = await r.text();
        console.error("Gemini error (query auth):", r.status, t2);
        return res.status(500).json({ message: `Gemini error ${r.status}: ${t2}` });
      }
    }

    const data = await r.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      console.error("Gemini no candidates:", JSON.stringify(data));
      return res.status(200).json({ reply: "I couldn’t generate a reply 😅" });
    }
    return res.status(200).json({ reply });
  } catch (e) {
    console.error("Gemini call failed:", e);
    return res.status(500).json({ message: "Server error calling Gemini" });
  }
}
