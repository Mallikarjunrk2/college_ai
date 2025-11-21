// pages/api/chat.js
// Robust Gemini handler with ListModels discovery + fallback to OpenAI (optional)

async function fetchWithTimeout(url, opts = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

async function listModelsIfPossible(key) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${key}`;
    const r = await fetchWithTimeout(url, { method: "GET", headers: { "Content-Type": "application/json" } }, 8000);
    if (!r.ok) {
      const t = await r.text();
      console.warn("ListModels failed:", r.status, t);
      return null;
    }
    const j = await r.json();
    const models = j.models || [];
    // pick one that supports generateContent
    const candidate = models.find(m => {
      const methods = m?.supported_generation_methods || [];
      return methods.includes("generateContent");
    });
    return candidate?.name || null;
  } catch (e) {
    console.warn("ListModels error:", e?.message || e);
    return null;
  }
}

async function callGemini(modelName, key, payload) {
  const modelURL = `https://generativelanguage.googleapis.com/v1/${modelName}:generateContent`;
  // try header auth first
  try {
    let r = await fetchWithTimeout(modelURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key
      },
      body: JSON.stringify(payload),
    }, 20000);

    if (!r.ok) {
      // try query param fallback
      r = await fetchWithTimeout(`${modelURL}?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }, 20000);
    }

    if (!r.ok) {
      const text = await r.text();
      throw new Error(`Gemini error ${r.status}: ${text}`);
    }

    const json = await r.json();
    const reply = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    return { reply, raw: json };
  } catch (e) {
    throw e;
  }
}

async function callOpenAI(messages, key) {
  // Minimal Chat Completions fallback (OpenAI-compatible). If you don't have OPENAI_API_KEY, skip.
  try {
    const r = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // change if you prefer another model available in your account
        messages: messages.map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
        max_tokens: 512,
      }),
    }, 20000);

    if (!r.ok) {
      const t = await r.text();
      throw new Error(`OpenAI error ${r.status}: ${t}`);
    }
    const j = await r.json();
    return j?.choices?.[0]?.message?.content || null;
  } catch (e) {
    throw e;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // Build Gemini payload format
  const payload = { contents: messages.map(m => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content }] })) };

  if (!geminiKey && !openaiKey) {
    return res.status(500).json({ message: "No GEMINI_API_KEY or OPENAI_API_KEY configured." });
  }

  // Try Gemini first if key exists
  if (geminiKey) {
    try {
      // 1) Try ListModels to discover an available model supporting generateContent
      let modelName = await listModelsIfPossible(geminiKey);
      if (!modelName) {
        // safe fallbacks (common model ids)
        modelName = "models/gemini-2.5-flash" || "models/gemini-2.5-pro";
      }
      console.log("Using Gemini model:", modelName);

      const { reply, raw } = await callGemini(modelName, geminiKey, payload);
      if (reply) {
        return res.status(200).json({ reply });
      } else {
        console.warn("Gemini returned no textual candidate. Raw:", JSON.stringify(raw));
        // continue to fallback
      }
    } catch (gemErr) {
      console.error("Gemini call failed:", gemErr?.message || gemErr);
      // fall through to OpenAI fallback if available
    }
  }

  // If Gemini failed and OpenAI key exists, fallback to OpenAI
  if (openaiKey) {
    try {
      const text = await callOpenAI(messages, openaiKey);
      if (text) return res.status(200).json({ reply: text });
    } catch (openErr) {
      console.error("OpenAI fallback failed:", openErr?.message || openErr);
    }
  }

  // Final fallback response
  return res.status(200).json({ reply: "Sorry — I couldn't reach the model right now. Please try again in a few minutes." });
}
