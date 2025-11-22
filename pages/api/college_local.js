// pages/api/college_local.js
import fs from "fs";
import path from "path";

function loadLocal() {
  try {
    const p = path.join(process.cwd(), "data", "college_local.json");
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("loadLocal error:", e?.message || e);
    return null;
  }
}

function normalize(s = "") {
  return String(s || "").toLowerCase();
}

function parseYear(q) {
  if (!q) return null;
  const r = q.match(/(20\d{2})\s*[-–]\s*(\d{2,4})/);
  if (r) {
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

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const qRaw = (req.body?.question || "").trim();
  const q = normalize(qRaw);
  if (!q) return res.status(200).json({ reply: "" });

  const data = loadLocal();
  if (!data) return res.status(500).json({ message: "Local data not found" });

  const college = data.college || {};
  const faculty = data.faculty || [];
  const placements = data.placements || [];
  const curriculum = data.curriculum || {};

  // College info
  if (q.includes("address") || q.includes("where") || q.includes("location")) {
    const reply = `${college.name || "HSIT"} — ${college.address || "Nidasoshi, Belagavi"}. Phone: ${college.phone || "N/A"}.`;
    return res.status(200).json({ reply });
  }
  if (q.includes("establish") || q.includes("founded") || q.includes("established")) {
    return res.status(200).json({ reply: `${college.name || "HSIT"} was established in ${college.established || "N/A"}.` });
  }
  if (q.includes("affiliat") || q.includes("aicte") || q.includes("approved")) {
    return res.status(200).json({ reply: `Affiliation: ${college.affiliation || "N/A"}. Approved by: ${college.approved_by || "N/A"}.` });
  }

  // Placements
  if (q.includes("placement") || q.includes("package") || q.includes("lpa")) {
    const year = parseYear(q);
    if (year) {
      const rows = placements.filter(p => p.year === year);
      if (rows.length) {
        const totalOffers = rows.reduce((s, r) => s + Number(r.offers || 0), 0);
        const highest = Math.max(...rows.map(r => Number(r.salary_lpa || 0)));
        const lines = rows.map(r => `${r.company_name} - ${r.offers} offers, ${r.salary_lpa} LPA`);
        return res.status(200).json({ reply: `Placements for ${year}: ${lines.join(", ")}. Total offers: ${totalOffers}. Highest: ${highest} LPA.` });
      }
      return res.status(200).json({ reply: "" });
    } else {
      if (placements.length) {
        const sample = placements.slice(0, 6).map(r => `${r.company_name} (${r.year}) - ${r.salary_lpa} LPA`);
        return res.status(200).json({ reply: `Recent placements: ${sample.join(", ")}` });
      }
      return res.status(200).json({ reply: "" });
    }
  }

  // Faculty: department or person lookup
  if (q.includes("faculty") || q.includes("professor") || q.includes("hod") || q.includes("staff")) {
    // dept detection
    const deptCodes = ["cse","ece","me","ce","eee","computer science","computer science and engineering","electronics","mechanical","civil","electrical"];
    const deptFound = deptCodes.find(d => q.includes(d));
    if (deptFound) {
      const rows = faculty.filter(f => (f.department || "").toLowerCase().includes(deptFound));
      if (rows.length) {
        const lines = rows.map(r => `${r.name} — ${r.designation}${r.email_official ? `, ${r.email_official}` : ""}`);
        return res.status(200).json({ reply: `Faculty for ${deptFound}:\n${lines.join("\n")}` });
      }
      return res.status(200).json({ reply: "" });
    }

    // name match - check tokens of each faculty name
    const nameHits = faculty.filter(f => {
      const n = (f.name || "").toLowerCase();
      return q.split(/\s+/).some(tok => tok.length > 2 && n.includes(tok));
    });

    if (nameHits.length === 1) {
      const f = nameHits[0];
      const reply = `${f.name} — ${f.designation} (${f.department}). Email: ${f.email_official || f.email_other || "N/A"}. Phone: ${f.mobile || "N/A"}.`;
      return res.status(200).json({ reply });
    } else if (nameHits.length > 1) {
      const lines = nameHits.map(f => `${f.name} — ${f.designation} (${f.department})`);
      return res.status(200).json({ reply: `Found multiple matches:\n${lines.join("\n")}` });
    }

    // default faculty list
    if (faculty.length) {
      const list = faculty.slice(0, 50).map(f => `${f.name} — ${f.designation} (${f.department})`).join("\n");
      return res.status(200).json({ reply: `Faculty overview:\n${list}` });
    }

    return res.status(200).json({ reply: "" });
  }

  // Curriculum (semester)
  if (q.includes("semester") || q.includes("sem") || q.includes("subject") || q.includes("syllabus")) {
    // try branch + sem e.g., "CSE semester 1"
    const branch = Object.keys(curriculum).find(b => q.includes(b.toLowerCase())) || "CSE";
    const semMatch = q.match(/\b(?:sem(?:ester)?\s*|semester\s*)(\d+)/);
    if (semMatch) {
      const semKey = `Semester ${semMatch[1]}`;
      const subjects = (curriculum[branch] || {})[semKey];
      if (subjects && subjects.length) {
        return res.status(200).json({ reply: `Subjects for ${branch} ${semKey}:\n${subjects.join("\n")}` });
      }
    }
    return res.status(200).json({ reply: "" });
  }

  // fallback: empty so frontend can call LLM if it wants
  return res.status(200).json({ reply: "" });
}
