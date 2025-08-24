import supabase from "../../lib/supabase";

export default async function handler(req, res) {
  try {
    // Just check if we can fetch one row from placements
    const { data, error } = await supabase
      .from("placements")
      .select("*")
      .limit(1);

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({
      ok: true,
      rowsFetched: data.length,
      sampleRow: data[0] || null,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
