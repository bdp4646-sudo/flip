// /api/generate.js  — deploy this on Vercel
// Set ANTHROPIC_API_KEY in Vercel environment variables (never in code)

// Simple in-memory rate limiting (resets on cold start, good enough for MVP)
const ipRequests = new Map();
const dailyStats = { count: 0, date: new Date().toDateString() };

const RATE_LIMIT_PER_IP = 5;        // max 5 AI generations per IP per day
const DAILY_REQUEST_CAP = 100;      // max 100 total generations per day across all users

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Reset daily counter if it's a new day
  const today = new Date().toDateString();
  if (dailyStats.date !== today) {
    dailyStats.count = 0;
    dailyStats.date = today;
    ipRequests.clear();
  }

  // Check global daily cap
  if (dailyStats.count >= DAILY_REQUEST_CAP) {
    return res.status(429).json({ error: "Daily limit reached. Try again tomorrow." });
  }

  // Get IP (Vercel sets x-forwarded-for)
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";

  // Check per-IP rate limit
  const ipCount = ipRequests.get(ip) || 0;
  if (ipCount >= RATE_LIMIT_PER_IP) {
    return res.status(429).json({ error: "You've used your free AI generations for today. Fill in manually!" });
  }

  // Validate request body
  const { description } = req.body || {};
  if (!description || typeof description !== "string" || description.trim().length === 0) {
    return res.status(400).json({ error: "No description provided." });
  }

  // Cap description length so no one sends a novel
  if (description.length > 500) {
    return res.status(400).json({ error: "Description too long. Keep it under 500 characters." });
  }

  // Call Anthropic — key is server-side only, never exposed
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", // cheapest model — plenty good for listing generation
        max_tokens: 300,                     // listings don't need more than this
        messages: [{
          role: "user",
          content: `You are a resale listing assistant. Given a rough description of an item someone wants to sell, return a JSON object with these fields:
- title: punchy, specific listing title (max 60 chars)
- price: suggested asking price in USD (integer, no $ sign)
- condition: one of ["Like New","Great","Good","Fair","For Parts"]
- category: one of ["Electronics","Clothing","Furniture","Books","Sports","Toys","Collectibles","Other"]
- desc: a compelling 1-2 sentence description that highlights value

Return ONLY valid JSON, no markdown, no preamble.

Item description: "${description.trim()}"`
        }]
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.find(b => b.type === "text")?.text || "{}";
    const listing = JSON.parse(text.replace(/```json|```/g, "").trim());

    // Only increment counters on success
    ipRequests.set(ip, ipCount + 1);
    dailyStats.count++;

    return res.status(200).json(listing);

  } catch (err) {
    console.error("Generation error:", err);
    return res.status(500).json({ error: "Failed to generate listing. Try filling in manually." });
  }
}