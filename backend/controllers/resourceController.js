// backend/controllers/resourceController.js

const {
  fetchDuckDuckGoResults,
  getYouTubeSearchLinks,
  fetchWikipediaSummary,
} = require("../services/resourceService");

const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function extractKeywords(text) {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a keyword extractor. Given a note or topic, return only 3-5 clean search keywords as a single line, comma-separated. No explanation, no extra text.`,
        },
        {
          role: "user",
          content: `Extract keywords from this: "${text}"`,
        },
      ],
      max_tokens: 50,
    });
    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error("Groq keyword extraction error:", err.message);
    return text;
  }
}

async function getResources(req, res) {
  try {
    const { topic } = req.body;

    if (!topic || topic.trim() === "") {
      return res.status(400).json({ error: "Topic is required" });
    }

    const keywords = await extractKeywords(topic);
    console.log("Extracted keywords:", keywords);

    const [duckduckgoResults, wikipediaResult] = await Promise.all([
      fetchDuckDuckGoResults(keywords),
      fetchWikipediaSummary(keywords),
    ]);

    const youtubeLinks = getYouTubeSearchLinks(keywords);

    return res.json({
      keywords,
      articles: duckduckgoResults,
      videos: youtubeLinks,
      wikipedia: wikipediaResult,
    });
  } catch (err) {
    console.error("getResources error:", err.message);
    return res.status(500).json({ error: "Failed to fetch resources" });
  }
}

module.exports = { getResources };