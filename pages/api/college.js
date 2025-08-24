import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const TABLE = "placements";

// Parse year like "2024-25" or single "2025" => "2025-26"
function parseYear(q) {
  const range = q.match(/(20\d{2})\s*-\s*(\d{2})/);
  if (range) return `${range[1]}-${range[2]}`;
  const single = q.match(/\b(20\d{2})\b/);
  if (single) {
    const start = Number(single[1]);
    const end = String((start + 1) % 100).padStart(2, "0");
    return `${start}-${end}`;
  }
  return null; // let us fetch latest if not provided
}

function detectIntent(q) {
  if (/(highest|max|top).*(package|salary|lpa)/.test(q)) return "highest";
  if (/offers?/.test(q)) return "company_offers";
  if (/(list|show|which|visited|recruiters|placements?)/.test(q)) return "summary";
  return null;
}

function extractCompany(original) {
  const m = original.match(/\b(?:from|at|by)\s+([a-z0-9 .&+\-()\/']+)/i);
  if (m) return m[1].trim();
  const m2 = original.match(/offers?\s+(?:from|by|at)?\s*([a-z0-9 .&+\-()\/']+)/i);
  return m2 ? m2[1].trim() : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const original = (req.body?.question || "").trim();
  const q = original.toLowerCase().replace(/\bcollage\b/g, "college");
  let year = parseYear(q);
  const intent = detectIntent(q);

  try {
    // If year not specified, use latest in DB
    if (!year) {
      const { data: latest, error: yerr } = await supabase
        .from(TABLE)
        .select("year")
        .order("year", { ascending: false })
        .limit(1);
      if (yerr) throw yerr;
      year = latest?.[0]?.year || "2024-25";
    }

    if (intent === "highest") {
      const { data, error } = await supabase
        .from(TABLE)
        .select("company_name,salary_lpa")
        .eq("year", year)
        .order("salary_lpa", { ascending: false })
        .limit(1);
      if (error) throw error;
      if (data?.length) {
        const r = data[0];
        return res.status(200).json({ reply: `Highest package in ${year} was ${r.salary_lpa} LPA at ${r.company_name}.` });
      }
      return res.status(200).json({ reply: "" });
    }

    if (intent === "company_offers") {
      const company = extractCompany(original);
      if (company) {
        const { data, error } = await supabase
          .from(TABLE)
          .select("company_name,offers")
          .ilike("company_name", `%${company}%`)
          .eq("year", year);
        if (error) throw error;
        if (data?.length) {
          const total = data.reduce((s, r) => s + Number(r.offers || 0), 0);
          return res.status(200).json({ reply: `${data[0].company_name} made ${total} offer(s) in ${year}.` });
        }
      }
      return res.status(200).json({ reply: "" });
    }

    if (intent === "summary" || q.includes("placement")) {
      const { data, error } = await supabase
        .from(TABLE)
        .select("company_name,offers,salary_lpa")
        .eq("year", year);
      if (error) throw error;
      if (data?.length) {
        const totalOffers = data.reduce((s, r) => s + Number(r.offers || 0), 0);
        const highest = Math.max(...data.map(r => Number(r.salary_lpa || 0)));
        const lines = data.map(r => `${r.company_name} - ${r.offers} offers, Package: ${r.salary_lpa} LPA`).join(", ");
        return res.status(200).json({ reply: `Placements for ${year}: ${lines}. Total offers: ${totalOffers}. Highest: ${highest} LPA.` });
      }
      return res.status(200).json({ reply: "" });
    }

    // no intent matched -> let frontend fall back to Gemini
    return res.status(200).json({ reply: "" });
  } catch (e) {
    console.error("college.js error:", e);
    return res.status(500).json({ message: e.message || "Server error" });
  }
}
