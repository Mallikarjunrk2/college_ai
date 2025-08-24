// pages/api/college.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { question } = req.body;

  try {
    let answer = "";

    // Example: placement queries
    if (question.toLowerCase().includes("placement")) {
      const { data, error } = await supabase
        .from("placements")
        .select("*");

      if (error) throw error;

      if (data.length > 0) {
        answer = `Placements for ${data[0].year}: \n\n` +
          data.map(p => 
            `${p.company_name} - ${p.offers} offers, Package: ${p.salary_lpa} LPA`
          ).join("\n");
      }
    }

    // If no placement match → fallback to Gemini
    if (!answer) {
      const geminiRes = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + process.env.GEMINI_API_KEY,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: question }] }]
          })
        }
      );
      const geminiData = await geminiRes.json();
      answer = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn’t find an answer 😅";
    }

    res.status(200).json({ reply: answer });

  } catch (err) {
    console.error("college.js error:", err);
    res.status(500).json({ error: err.message });
  }
}
