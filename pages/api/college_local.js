// pages/api/college_local.js
import fs from "fs";
import path from "path";

function safeReadJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("JSON read error:", e);
    return {};
  }
}

function findFacultyByName(faculty, name) {
  const n = name.toLowerCase();
  return faculty.find(f => (f.name || "").toLowerCase().includes(n));
}

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const question = (req.body?.question || "").toString().trim().toLowerCase();
  if (!question) return res.status(200).json({ reply: "" });

  const jsonPath = path.join(process.cwd(), "data", "college_local.json");
  const data = safeReadJSON(jsonPath);

  const basic = data.basic || {};
  const placements = data.placements || [];
  const faculty = data.faculty || [];

  // 1) 'placement' intent (optionally detect year)
  if (question.includes("placement") || question.includes("placements")) {
    // attempt to extract year like "2024" or "2024-25"
    const yearMatch = question.match(/(20\d{2}(?:-\d{2})?)/);
    const year = yearMatch ? yearMatch[0] : null;

    const list = year ? placements.filter(p => (p.year || "").toString().includes(year)) : placements;
    if (list.length === 0) return res.status(200).json({ reply: "" });

    // simple summary: list companies and offers (limit to first 10)
    const lines = list.slice(0, 20).map(p => `${p.company_name} - ${p.offers || 0} offers, Package: ${p.salary_lpa || "N/A"} LPA`);
    const totalOffers = list.reduce((s, r) => s + Number(r.offers || 0), 0);
    const highest = Math.max(...list.map(r => Number(r.salary_lpa || 0)));
    const reply = `Placements${year ? ` for ${year}` : ""}: ${lines.join(", ")}. Total offers: ${totalOffers}. Highest: ${highest || "N/A"} LPA.`;
    return res.status(200).json({ reply });
  }

  // 2) faculty list or department
  if (question.includes("faculty") || question.includes("professor") || question.includes("staff")) {
    // check department word e.g., "cse", "computer", "mechanical"
    const depts = ["computer", "cse", "mechanical", "civil", "ece", "eee", "electrical"];
    const foundDept = depts.find(d => question.includes(d));
    if (foundDept) {
      // match department by substring
      const deptName = foundDept;
      const results = faculty.filter(f => (f.department || "").toLowerCase().includes(deptName));
      if (results.length) {
        const lines = results.map(r => `${r.name} (${r.designation || "Staff"}) - ${r.email_official || r.email || "N/A"}`);
        return res.status(200).json({ reply: `Faculty in ${deptName.toUpperCase()}: ${lines.join(", ")}` });
      } else {
        return res.status(200).json({ reply: "" });
      }
    }

    // general faculty list
    if (question.includes("list") || question.includes("all") || question.includes("show")) {
      if (faculty.length) {
        const lines = faculty.slice(0, 30).map(r => `${r.name} - ${r.department || "N/A"} (${r.designation || "Staff"})`);
        return res.status(200).json({ reply: `Faculty list: ${lines.join(", ")}` });
      }
      return res.status(200).json({ reply: "" });
    }

    // else unknown faculty intent -> fall back
    return res.status(200).json({ reply: "" });
  }

  // 3) lookup by name: email or phone
  if (question.includes("email") || question.includes("mail") || question.includes("@")) {
    // try to extract a name from question (simple heuristic: last word(s))
    const words = question.replace(/[?]/g, "").split(/\s+/);
    // try last two words as name
    const nameGuess = words.slice(-2).join(" ");
    const found = findFacultyByName(faculty, nameGuess) || findFacultyByName(faculty, words.slice(-1).join(" "));
    if (found) {
      const email = found.email_official || found.email || found.email_other || "Not available";
      return res.status(200).json({ reply: `${found.name} — ${email}` });
    }
    // try any name present in question by scanning faculty list
    for (const f of faculty) {
      if (question.includes((f.name || "").toLowerCase().split(" ")[0])) {
        const email = f.email_official || f.email || "Not available";
        return res.status(200).json({ reply: `${f.name} — ${email}` });
      }
    }
    return res.status(200).json({ reply: "" });
  }

  // 4) basic info (address, established, contact)
  if (question.includes("address") || question.includes("location") || question.includes("where")) {
    if (basic?.address) return res.status(200).json({ reply: basic.address });
    if (basic?.location) return res.status(200).json({ reply: basic.location });
    return res.status(200).json({ reply: "" });
  }

  if (question.includes("established") || question.includes("established in") || question.includes("founded")) {
    if (basic?.established) return res.status(200).json({ reply: `Established: ${basic.established}` });
    return res.status(200).json({ reply: "" });
  }

  // default: nothing matched — let frontend fallback to LLM
  return res.status(200).json({ reply: "" });
}