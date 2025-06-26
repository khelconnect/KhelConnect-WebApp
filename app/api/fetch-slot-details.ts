// /pages/api/fetch-slot-details.ts
import { supabase } from "@/lib/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { slotIds } = req.body;
  if (!slotIds || !Array.isArray(slotIds)) {
    return res.status(400).json({ error: "Invalid slotIds" });
  }

  const { data, error } = await supabase
    .from("time_slots")
    .select("id, start_time, end_time")
    .in("id", slotIds);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
}
