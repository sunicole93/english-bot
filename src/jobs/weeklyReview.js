import "dotenv/config";
import { getWeeklyStats } from "../services/supabaseService.js";
import { generateWeeklyReport } from "../services/groq.js";
import { pushWeeklyReport } from "../services/lineService.js";

export async function run() {
  try {
    console.log("[WeeklyReview] Job started");

    // 1. Get weekly stats from Supabase
    const stats = await getWeeklyStats();
    console.log("[WeeklyReview] Stats retrieved");

    // 2. Generate weekly report via Gemini
    const report = await generateWeeklyReport(stats);
    console.log("[WeeklyReview] Report generated");

    // 3. Push LINE message
    await pushWeeklyReport(report);

    console.log("[WeeklyReview] Job completed successfully");
  } catch (err) {
    console.error("[WeeklyReview] Job failed:", err);
  }
}
