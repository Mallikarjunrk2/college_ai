// pages/api/college.js
import supabase from "../../lib/supabase";

/**
 * College API handler:
 * - Checks faculty_list table for faculty queries (list, by dept, single name, specific field)
 * - Falls back to placements handling (existing logic)
 * - Falls back to college_faq (if you use it)
 * - If nothing found, returns { reply: "" } so frontend falls back to AI
 */

// helper normalize
const norm = (s = "") => String(s || "").trim().toLowerCase();

// detect whether question looks college-related (we check here; frontend still decides fallback)
function looksCollegeRelated(q = "") {
  return /college|faculty|placement|placements|fees|admission|principal|department|campus|hostel|faculty list|staff|professor|teacher|email|phone|contact|placements?/.test(q);
}

// extract department (very small list; you can extend)
function extractDepartment(q = "") {
  const d = q.match(/\b(computer science|computer|cs|mechanical|civil|electrical|eee|ece|electronics|management|mba|applied sciences|civil engineering|mechanical engineering)\b/i);
  return d ? d[0].toLowerCase().replace(/\s+engineering$/, "").replace("computer science", "cs") : null;
}

// try to extract a person name from typical patterns: "ramesh", "email of ramesh", "who is ramesh"
function extractName(q = "") {
  // look for "of NAME", "is NAME", "name NAME"
  let m = q.match(/\b(?:of|is|named)\s+([a-z][a-z.'-]+\s?[a-z']*)/i);
  if (m) return m[1].trim();
  // fallback: pick capitalized word(s) (if any)
  m = q.match(/\b([A-Z][a-z]{2,})(?:\s+[A-Z][a-z]{2,})?\b/);
  if (m) return m[0].trim();
  // fallback: pick a last token that's not a stopword
  const tokens = q.split(/\W+/).filter(Boolean);
  const stops = new Set(["the","a","an","in","on","at","of","for","and","or","with","to","is","are","was","were","by"]);
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i].toLowerCase();
    if (!stops.has(t) && t.length > 2) return tokens[i];
  }
  return null;
}

function wantsField(q = "") {
  if (/\bemail\b/.test(q)) return "email_id";
  if (/\bphone|mobile|contact\b/.test(q)) return "phone_number";
  // allow "department" or "dept"
  if (/\bdepartment|dept\b/.test(q)) return "department";
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const original = (req.body?.question || "").trim();
  const q = norm(original);

  // If it's not even college related, return empty so frontend can fallback
  if (!looksCollegeRelated(q)) {
    return res.status(200).json({ reply: "" });
  }

  try {
    // ---------- FACULTY HANDLING ----------
    // If the question mentions "faculty", "staff", "professor", etc.
    if (/\bfaculty|staff|professor|teacher|lecturer\b/.test(q)) {
      const dept = extractDepartment(original); // prefer original-case string
      const name = extractName(original);
      const field = wantsField(q); // e.g., 'email_id' or 'phone_number'

      // Build supabase query
      let query = supabase.from("faculty_list").select("id,name,department,phone_number,email_id");

      if (dept) {
        // filter by department (fuzzy)
        query = query.ilike("department", `%${dept}%`);
      }

      if (name) {
        // fuzzy name match
        query = query.ilike("name", `%${name}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.error("faculty query error:", error);
        return res.status(500).json({ message: "Database error" });
      }

      if (!data || data.length === 0) {
        // no DB match -> return empty so frontend falls back to AI
        return res.status(200).json({ reply: "" });
      }

      // If user wanted a specific field for a single person (email/phone), return that only
      if (field && data.length >= 1) {
        // prefer exact name match if multiple, otherwise first row
        const row = data[0];
        const val = row[field] || "";
        if (!val) return res.status(200).json({ reply: "" }); // no data -> fallback
        // Return short plain text or markdown
        return res.status(200).json({ reply: `**${row.name}** — ${field === "email_id" ? "Email" : "Phone"}: ${val}` });
      }

      // If user asked for just "faculty list" or "cs faculty list", return a markdown list
      const lines = data.map((r) => {
        const deptText = r.department ? `Dept: ${r.department}` : "";
        const phoneText = r.phone_number ? `, Phone: ${r.phone_number}` : "";
        const emailText = r.email_id ? `, Email: ${r.email_id}` : "";
        return `- **${r.name}** — ${deptText}${phoneText}${emailText}`;
      });

      const header = dept ? `Faculty list — ${dept.toUpperCase()}` : `Faculty list`;
      return res.status(200).json({ reply: `**${header}**\n\n${lines.join("\n")}` });
    }

    // ---------- PLACEMENTS (existing behavior) ----------
    // Keep current placements logic — try to reuse your placements handling
    if (/\bplacement|placements|package|offers|recruiter|company\b/.test(q)) {
      // Attempt to parse year like "2024-25" or "2025"
      function parseYear(q) {
        const range = q.match(/(20\d{2})\s*-\s*(\d{2})/);
        if (range) return `${range[1]}-${range[2]}`;
        const single = q.match(/\b(20\d{2})\b/);
        if (single) {
          const start = Number(single[1]);
          const end = String((start + 1) % 100).padStart(2, "0");
          return `${start}-${end}`;
        }
        return null;
      }

      function detectIntentLocal(q) {
        if (/(highest|max|top).*(package|salary|lpa)/.test(q)) return "highest";
        if (/offers?/.test(q)) return "company_offers";
        if (/(list|show|which|visited|recruiters|placements?)/.test(q)) return "summary";
        return null;
      }

      const TABLE = "placements";
      let year = parseYear(q);
      const intent = detectIntentLocal(q);

      // if user asked "last year" -> get latest
      if (/\b(last year|previous year|last academic year)\b/.test(q) || !year) {
        const { data: latest, error: yerr } = await supabase
          .from(TABLE)
          .select("year")
          .order("year", { ascending: false })
          .limit(1);
        if (!yerr && latest?.length) year = latest[0].year;
      }

      if (!year) year = "2024-25";

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
        const company = q.match(/\b(?:from|at|by)\s+([a-z0-9 .&+\-()\/']+)/i)?.[1] || null;
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
    }

    // ---------- FAQ table fallback (if you added college_faq) ----------
    if (true) {
      // check college_faq table for simple QA matches (optional)
      const { data: faqData } = await supabase.from("college_faq").select("question,answer");
      if (faqData && faqData.length) {
        // try basic matching
        const qWords = q.split(/\W+/).filter(Boolean);
        let best = null;
        let bestScore = 0;
        for (const row of faqData) {
          const qRow = norm(row.question);
          let score = 0;
          for (const w of qWords) if (qRow.includes(w)) score++;
          if (score > bestScore) {
            bestScore = score;
            best = row;
          }
        }
        if (best && bestScore > 0) {
          return res.status(200).json({ reply: best.answer });
        }
      }
    }

    // nothing matched in DB -> return empty for AI fallback
    return res.status(200).json({ reply: "" });
  } catch (e) {
    console.error("college.js error:", e);
    return res.status(500).json({ message: e.message || "Server error" });
  }
}
