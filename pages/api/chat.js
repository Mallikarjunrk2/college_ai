export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ message: "Missing GEMINI_API_KEY" });

  const { messages } = req.body || { messages: [] };

  try {
    // Use latest, fast, free-tier friendly model + v1beta endpoint
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: messages.map(m => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }]
        }))
      })
    });

    // If Gemini returns an error, surface it so we can see it in Vercel logs
    if (!r.ok) {
      const errText = await r.text();
      console.error("Gemini HTTP error:", r.status, errText);
      return res.status(500).json({ message: `Gemini error ${r.status}: ${errText}` });
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
    return res.status(500).json({ message: "Server error calling Gem
