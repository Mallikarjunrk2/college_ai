import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { messages } = req.body;
  const userMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";

  try {
    // --- Case 1: user asks about placements ---
    if (userMessage.includes("placement")) {
      let yearMatch = userMessage.match(/20\d{2}-\d{2}/); // e.g. 2024-25
      let year = yearMatch ? yearMatch[0] : null;

      let query = supabase.from("placements").select("*");

      if (year) {
        query = query.eq("year", year);
      } else {
        // If year not given, take latest year
        const { data: latestYear } = await supabase
          .from("placements")
          .select("year")
          .order("year", { ascending: false })
          .limit(1);
        if (latestYear?.length) {
          year = latestYear[0].year;
          query = query.eq("year", year);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        return res.status(200).json({ reply: "No placement data found 😅" });
      }

      const reply = `Placements for ${year}: ` + data.map(r =>
        `${r.name_of_the_company} - ${r.number_of_offers} offers, Package: ${r.package} LPA`
      ).join("; ");

      return res.status(200).json({ reply });
    }

    // --- Case 2: fallback to Gemini ---
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userMessage }] }]
        }),
      }
    );

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn’t generate a reply 😅";

    res.status(200).json({ reply });
  } catch (err) {
    console.error("College API error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
