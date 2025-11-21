// pages/api/college.js
// Universal intent router: faculty, placements, faq, and DB-first fallback
import supabase from "../../lib/supabase";

const norm = (s = "") => String(s || "").trim().toLowerCase();

function looksCollegeRelated(q = "") {
  return /college|faculty|placement|placements|fees|admission|principal|department|campus|hostel|staff|professor|teacher|email|phone|contact|placements?/.test(q);
}

// Extract department token (extend synonyms as needed)
function extractDepartment(q = "") {
  const m = q.match(/\b(computer science|computer|cs|cse|mechanical|civil|electrical|eee|ece|electronics|management|mba|applied sciences|civil engineering|mechanical engineering)\b/i);
  if (!m) return null;
  const found = m[0].toLowerCase();
  if (/computer/.test(found)) return "cs";
  if (/cse/.test(found)) return "cs";
  return found.replace(/\s+engineering$/, "").trim();
}

// Try to extract a name from patterns like "email of Ramesh", "who is Ramesh"
function extractName(q = "") {
  // Prefer "of NAME" or "is NAME" patterns
  let m = q.match(/\b(?:of|is|named|for)\s+([A-Za-z][A-Za-z.'`-]+(?:\s+[A-Za-z][A-Za-z.'`-]+)?)\b/);
  if (m) return m[1].trim();
  // Capitalized name heuristic
  m = q.match(/\b([A-Z][a-z]{2,})(?:\s+[A-Z][a-z]{2,})?\b/);
  if (m) return m[0];
  // fallback: last non-stopword token
  const tokens = q.split(/\W+/).filter(Boolean);
  const stops = new Set(["the","a","an","in","on","at","of","for","and","or","with","to","is","are","was","were","by","faculty","list"]);
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i].toLowerCase();
    if (!stops.has(t) && t.length > 1) return tokens[i];
  }
  return null;
}

function wantsField(q = "") {
  if (/\bemail\b/.test(q)) return "email";
  if (/\bphone|mobile|contact\b/.test(q)) return "phone";
  if (/\bdepartment|dept\b/.test(q)) return "department";
  return null;
}

async function queryFaculty({ dept, name }) {
  let q = supabase.from("faculty_list").select("id,name,department,phone,email");
  if (dept) q = q.ilike("department", `%${dept}%`);
  if (name) q = q.ilike("name", `%${name}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

async function queryPlacements({ year, intent, company }) {
  const TABLE = "Collage_placements";
  if (intent === "highest") {
    const { data, error } = await supabase.from(TABLE).select("company_name,salary_lpa").eq("year", year).order("salary_lpa", { ascending: false }).limit(1);
    if (error) throw error;
    return data || [];
  }
  if (intent === "company_offers" && company) {
    const { data, error } = await supabase.from(TABLE).select("company_name,offers").ilike("company_name", `%${company}%`).eq("year", year);
    if (error) throw error;
    return data || [];
  }
  if (intent === "summary" || true) {
    const { data, error } = await supabase.from(TABLE).select("company_name,offers,salary_lpa").eq("year", year);
    if (error) throw error;
    return data || [];
  }
}

// safe number parse
const safeNum = (v) => {
  const n = Number(String(v || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });
  const original = (req.body?.question || "").trim();
  const q = norm(original);

  // If not college related, return empty so frontend falls back to AI
  if (!looksCollegeRelated(q)) return res.status(200).json({ reply: "" });

  try {
    // ---------- FACULTY INTENT ----------
    if (/\bfaculty|staff|professor|teacher|lecturer\b/.test(q)) {
      const dept = extractDepartment(original);
      const name = extractName(original);
      const field = wantsField(q);

      const rows = await queryFaculty({ dept, name });

      if (!rows || rows.length === 0) return res.status(200).json({ reply: "" }); // fallback to AI

      // If user asked for a single field like email/phone for a person
      if (field) {
        // prefer exact name match if multiple, else first
        let match = rows.find(r => name && r.name && r.name.toLowerCase().includes((name || "").toLowerCase())) || rows[0];
        const val = match ? match[field] : null;
        if (!val) return res.status(200).json({ reply: "" });
        const label = field === "email" ? "Email" : "Phone";
        return res.status(200).json({ reply: `**${match.name}** — ${label}: ${val}` });
      }

      // If user asked for list (department or all)
      const lines = rows.map(r => {
        const deptText = r.department ? `Dept: ${r.department}` : "";
        const phoneText = r.phone ? `, Phone: ${r.phone}` : "";
        const emailText = r.email ? `, Email: ${r.email}` : "";
        return `- **${r.name}** — ${deptText}${phoneText}${emailText}`;
      });
      const header = dept ? `Faculty list — ${dept.toUpperCase()}` : `Faculty list`;
      return res.status(200).json({ reply: `**${header}**\n\n${lines.join("\n")}` });
    }

    // ---------- PLACEMENT INTENT ----------
    if (/\bplacement|placements|package|offers|recruiter|company\b/.test(q)) {
      // parse year utils
      const parseYear = (txt) => {
        const range = txt.match(/(20\d{2})\s*-\s*(\d{2})/);
        if (range) return `${range[1]}-${range[2]}`;
        const single = txt.match(/\b(20\d{2})\b/);
        if (single) {
          const start = Number(single[1]);
          const end = String((start + 1) % 100).padStart(2, "0");
          return `${start}-${end}`;
        }
        return null;
      };
      const detectIntent = (txt) => {
        if (/(highest|max|top).*(package|salary|lpa)/.test(txt)) return "highest";
        if (/offers?/.test(txt)) return "company_offers";
        if (/(list|show|which|visited|recruiters|placements?)/.test(txt)) return "summary";
        return null;
      };

      let year = parseYear(original);
      const intent = detectIntent(original);

      // if last year or no year, pick latest from DB
      if (/\b(last year|previous year|last academic year)\b/.test(q) || !year) {
        const { data: latest, error } = await supabase.from("Collage_placements").select("year").order("year", { ascending: false }).limit(1);
        if (!error && latest?.length) year = latest[0].year;
      }
      if (!year) year = "2024-25";

      // company extraction for offers
      const company = q.match(/\b(?:from|at|by)\s+([a-z0-9 .&+\-()\/']+)/i)?.[1] || null;

      const rows = await queryPlacements({ year, intent, company });

      if (!rows || rows.length === 0) return res.status(200).json({ reply: "" });

      if (intent === "highest") {
        const r = rows[0];
        return res.status(200).json({ reply: `Highest package in ${year} was ${r.salary_lpa} LPA at ${r.company_name}.` });
      }

      if (intent === "company_offers" && rows.length) {
        const total = rows.reduce((s, r) => s + safeNum(r.offers), 0);
        return res.status(200).json({ reply: `${rows[0].company_name} made ${total} offer(s) in ${year}.` });
      }

      // summary
      const totalOffers = rows.reduce((s, r) => s + safeNum(r.offers), 0);
      const highest = Math.max(...rows.map(r => safeNum(r.salary_lpa || 0)));
      const lines = rows.map(r => `${r.company_name} - ${r.offers} offers, Package: ${r.salary_lpa} LPA`);
      return res.status(200).json({ reply: `Placements for ${year}: ${lines.join(", ")}. Total offers: ${totalOffers}. Highest: ${highest} LPA.` });
    }

    // ---------- FAQ TABLE (simple best word-match) ----------
    {
      const { data: faqData } = await supabase.from("college_faq").select("question,answer");
      if (faqData && faqData.length) {
        const qWords = q.split(/\W+/).filter(Boolean);
        let best = null;
        let bestScore = 0;
        for (const row of faqData) {
          const rnorm = norm(row.question);
          let score = 0;
          for (const w of qWords) if (rnorm.includes(w)) score++;
          if (score > bestScore) {
            bestScore = score;
            best = row;
          }
        }
        if (best && bestScore > 0) return res.status(200).json({ reply: best.answer });
      }
    }

    // nothing matched in DB => tell frontend to fallback to AI
    return res.status(200).json({ reply: "" });
  } catch (e) {
    console.error("college.js error:", e);
    return res.status(500).json({ message: e.message || "Server error" });
  }
}
