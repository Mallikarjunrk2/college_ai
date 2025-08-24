export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { messages } = req.body || { messages: [] };

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: messages.map((m) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }],
          })),
        }),
      }
    );

    const data = await response.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I couldn’t generate a reply 😅";

    res.status(200).json({ reply });
  } catch (error) {
    console.error("Gemini API error:", error);
    res.status(500).json({ message: "Error calling Gemini API" });
  }
}
