// pages/api/college.js
import supabase from "../../lib/supabase";

/**
 * college.js - DB-first intent router for CollegeGPT
 *
 * Behavior:
 *  - Try to answer from Supabase (placements, faculty, college_info)
 *  - If no DB answer -> return { reply: "" } so frontend will fall back to LLM (/api/chat)
 *
 * Required tables (recommended):
 *  - placements  (columns: year, company_name, offers, salary_lpa, ...)
 *  - faculty_list (columns: id, name, designation, department, email_official, email_other, mobile, notes, courses_taught)
 *  - college_info (single row preferred: name, address, phone, email, website, established, affiliation, approved_by, placements_summary)
 *
 */

const TABLE_PLACEMENTS = "placements";
const TABLE_FACULTY = "faculty_list";
const TABLE_COLLEGE = "college_info";

function parseYear(q) {
  if (!q) return null;
  const r = q.match(/(20\d{2})\s*[-–]\s*(\d{2,4})/);
  if (r) {
    // return as "2024-25" if second part is two digits, else keep as provided
    const a = r[1];
    const b = r[2].length === 2 ? r[2] : String(r[2]).slice(-2);
    return `${a}-${b}`;
  }
  const single = q.match(/\b(20\d{2})\b/);
  if (single) {
    const start = Number(single[1]);
    const end = String((start + 1) % 100).padStart(2, "0");
    return `${start}-${end}`;
  }
  return null;
}

function normalize(s = "") {
  return String(s || "").toLowerCase();
}

function detectIntent(q) {
  if (!q) return null;
  if (/(highest|max|top).*(package|salary|lpa)/i.test(q)) return "highest";
  if (/(placements?|placement|package|offers?|recruiters?)/i.test(q)) return "placements";
  if (/(faculty|profess|lecturer|hod|head of department|staff)/i.test(q)) return "faculty";
  if (/(address|location|where|located)/i.test(q)) return "college_info";
  if (/(affiliat|approved|aicte|vtU|university)/i.test(q)) return "college_info";
  if (/(offers? from|company|how many offer|made .* offers)/i.test(q)) return "company_offers";
  if (/(semester|subjects|syllabus|curriculum|sem\s*\d)/i.test(q)) return "curriculum";
  return null;
}

function extractCompany(original) {
  if (!original) return null;
  const m = original.match(/\b(?:by|from|at)\s+([a-z0-9 .&+\-()\/']{2,})/i);
  if (m) return m[1].trim();
  const m2 = original.match(/offers?\s+(?:from|by|at)?\s*([a-z0-9 .&+\-()\/']{2,})/i);
  return m2 ? m2[1].trim() : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const original = (req.body?.question || "").trim();
  const q = normalize(original);

  try {
    // 1) college info (address, phone, established, affiliation)
    if (detectIntent(q) === "college_info" || /^(what is|who is|tell me).*(hsit|hirasugar)/i.test(original)) {
      // try to fetch one row from college_info
      try {
        const { data: collegeRows, error: cErr } = await supabase.from(TABLE_COLLEGE).select("*").limit(1);
        if (cErr) throw cErr;
        const info = collegeRows?.[0];
        if (info) {
          // answer specific asks
          if (q.includes("address") || q.includes("location") || q.includes("where")) {
            const reply = `${info.name || "HSIT"} — ${info.address || "Nidasoshi, Belagavi District, Karnataka"}. Phone: ${info.phone || "N/A"}.`;
            return res.status(200).json({ reply });
          }
          if (q.includes("establish") || q.includes("founded") || q.includes("established")) {
            return res.status(200).json({ reply: `${info.name || "HSIT"} was established in ${info.established || "N/A"}.` });
          }
          if (q.includes("affiliat") || q.includes("aicte") || q.includes("approved")) {
            return res.status(200).json({ reply: `Affiliation: ${info.affiliation || "N/A"}. Approved by: ${info.approved_by || "N/A"}.` });
          }
          // generic college info
          const generic = `${info.name || "HSIT"} — ${info.address || "Nidasoshi, Belagavi"}. Phone: ${info.phone || "N/A"}. Website: ${info.website || "N/A"}.`;
          return res.status(200).json({ reply: generic });
        }
      } catch (e) {
        console.error("college_info error:", e);
        // fallback to empty -> LLM
        return res.status(200).json({ reply: "" });
      }
    }

    // 2) Placements-related
    const year = parseYear(q);
    const intent = detectIntent(q);

    if (intent === "placements" || intent === "highest") {
      // prefer DB placements table
      try {
        const fetchYear = year || undefined;
        if (intent === "highest") {
          const { data, error } = await supabase
            .from(TABLE_PLACEMENTS)
            .select("company_name,salary_lpa,year")
            .eq("year", fetchYear)
            .order("salary_lpa", { ascending: false })
            .limit(1);
          if (error) throw error;
          if (data?.length) {
            const r = data[0];
            return res.status(200).json({ reply: `Highest package in ${r.year || fetchYear} was ${r.salary_lpa} LPA at ${r.company_name}.` });
          }
          return res.status(200).json({ reply: "" });
        }

        // general placements summary for a year
        const { data, error } = await supabase
          .from(TABLE_PLACEMENTS)
          .select("company_name,offers,salary_lpa,year")
          .maybeSingle()
          .eq("year", fetchYear || undefined);

        // .maybeSingle() above will not work as intended for full lists; instead do a regular select
        if (year) {
          const { data: rowsByYear, error: yrErr } = await supabase
            .from(TABLE_PLACEMENTS)
            .select("company_name,offers,salary_lpa")
            .eq("year", year);
          if (yrErr) throw yrErr;
          if (rowsByYear?.length) {
            const totalOffers = rowsByYear.reduce((s, r) => s + Number(r.offers || 0), 0);
            const highest = Math.max(...rowsByYear.map(r => Number(r.salary_lpa || 0)));
            const lines = rowsByYear.map(r => `${r.company_name} - ${r.offers} offers, Package: ${r.salary_lpa} LPA`).join(", ");
            return res.status(200).json({ reply: `Placements for ${year}: ${lines}. Total offers: ${totalOffers}. Highest: ${highest} LPA.` });
          }
          return res.status(200).json({ reply: "" });
        }

        // if no year, return placements_summary from college_info if present
        const { data: clRows, error: clErr } = await supabase.from(TABLE_COLLEGE).select("placements_summary").limit(1);
        if (clErr) throw clErr;
        const summary = clRows?.[0]?.placements_summary;
        if (summary) return res.status(200).json({ reply: summary });
      } catch (e) {
        console.error("placements error:", e);
        return res.status(200).json({ reply: "" });
      }
    }

    // 3) Company offers (simple)
    if (/offers?/.test(q) && /(from|by|at)/.test(q)) {
      const company = extractCompany(original);
      if (company) {
        try {
          const { data, error } = await supabase
            .from(TABLE_PLACEMENTS)
            .select("company_name,offers,year")
            .ilike("company_name", `%${company}%`)
            .order("year", { ascending: false });
          if (error) throw error;
          if (data?.length) {
            const total = data.reduce((s, r) => s + Number(r.offers || 0), 0);
            return res.status(200).json({ reply: `${data[0].company_name} made ${total} offer(s) (latest year: ${data[0].year}).` });
          }
        } catch (e) {
          console.error("company_offers error:", e);
        }
      }
      return res.status(200).json({ reply: "" });
    }

    // 4) Faculty handling: department list, by-department, by-name or email lookup
    if (intent === "faculty") {
      try {
        // department-specific match first
        // check common abbreviations and department names
        const deptNames = ["computer science", "computer science and engineering", "cse", "electronics", "ece", "mechanical", "me", "civil", "ce", "eee", "electrical"];
        const deptFound = deptNames.find(d => q.includes(d));
        if (deptFound) {
          // query faculty table by department partial match
          const { data, error } = await supabase
            .from(TABLE_FACULTY)
            .select("name,designation,department,email_official,email_other,mobile,notes")
            .ilike("department", `%${deptFound}%`)
            .order("name", { ascending: true });
          if (error) throw error;
          if (data?.length) {
            const lines = data.map(r => `${r.name} — ${r.designation}${r.email_official ? `, ${r.email_official}` : ""}`);
            return res.status(200).json({ reply: `Faculty for ${deptFound}:\n${lines.join("\n")}` });
          }
          return res.status(200).json({ reply: "" });
        }

        // name lookup: try to find a person name within the question
        // naive approach: search each faculty name tokens
        const { data: allFaculty, error: fErr } = await supabase.from(TABLE_FACULTY).select("*").limit(200);
        if (fErr) throw fErr;

        if (allFaculty?.length) {
          const nameHits = allFaculty.filter(f => {
            const n = normalize(f.name);
            // if question contains full last name or any token from name
            const tokens = n.split(/\s+/).filter(Boolean);
            return tokens.some(t => t.length > 2 && q.includes(t));
          });

          if (nameHits.length === 1) {
            const f = nameHits[0];
            const reply = `${f.name} — ${f.designation} (${f.department}). Email: ${f.email_official || f.email_other || "N/A"}. Phone: ${f.mobile || "N/A"}. ${f.notes || ""}`;
            return res.status(200).json({ reply });
          } else if (nameHits.length > 1) {
            const lines = nameHits.map(f => `${f.name} — ${f.designation} (${f.department})`);
            return res.status(200).json({ reply: `Found multiple matches:\n${lines.join("\n")}` });
          }
        }

        // fallback: return a short faculty overview
        const { data: overview, error: ovErr } = await supabase
          .from(TABLE_FACULTY)
          .select("name,designation,department")
          .limit(50);
        if (ovErr) throw ovErr;
        if (overview?.length) {
          const lines = overview.map(r => `${r.name} — ${r.designation} (${r.department})`);
          return res.status(200).json({ reply: `Faculty overview:\n${lines.join("\n")}` });
        }
      } catch (e) {
        console.error("faculty handler error:", e);
        return res.status(200).json({ reply: "" });
      }
    }

    // 5) Curriculum / semester queries (if you add a curriculum table)
    if (intent === "curriculum") {
      try {
        // try a curriculum table: "curriculum" or "syllabus"
        const semMatch = q.match(/sem(?:ester)?\s*(\d+)/) || q.match(/\bsem\s*(\d+)/) || q.match(/semester\s*(\d+)/);
        if (semMatch) {
          const sem = Number(semMatch[1]);
          const { data, error } = await supabase.from("curriculum").select("sem,subjects,year").eq("sem", sem).limit(50);
          if (error) throw error;
          if (data?.length) {
            const lines = data.map(r => (r.subjects && Array.isArray(r.subjects) ? r.subjects.join(", ") : r.subjects || r.name));
            return res.status(200).json({ reply: `Subjects for semester ${sem}:\n${lines.join("\n")}` });
          }
          return res.status(200).json({ reply: "" });
        }
      } catch (e) {
        console.error("curriculum error:", e);
        return res.status(200).json({ reply: "" });
      }
    }

    // Nothing matched -> let frontend fallback to LLM
    return res.status(200).json({ reply: "" });

  } catch (e) {
    console.error("college.js fatal error:", e);
    return res.status(500).json({ message: e.message || "Server error" });
  }
}