// backend/services/resourceService.js

const axios = require("axios");

// ─── Serper Search (replaces DuckDuckGo) ───────────────────────────
async function fetchDuckDuckGoResults(query) {
  try {
    const res = await axios.post(
      "https://google.serper.dev/search",
      { q: `${query} study tutorial`, num: 5 },
      {
        headers: {
          "X-API-KEY": process.env.SERPER_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const results = res.data?.organic || [];

    return results.map((r) => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet,
      source: "duckduckgo",
    }));
  } catch (err) {
    console.error("Serper error:", err.message);
    return [];
  }
}

// ─── YouTube Search URLs (no API key) ──────────────────────────────
function getYouTubeSearchLinks(query) {
  const encoded = encodeURIComponent(query);
  return [
    {
      title: `"${query}" — Tutorials on YouTube`,
      url: `https://www.youtube.com/results?search_query=${encoded}+tutorial`,
      source: "youtube",
    },
    {
      title: `"${query}" — Lectures on YouTube`,
      url: `https://www.youtube.com/results?search_query=${encoded}+lecture`,
      source: "youtube",
    },
    {
      title: `"${query}" — Explained on YouTube`,
      url: `https://www.youtube.com/results?search_query=${encoded}+explained`,
      source: "youtube",
    },
  ];
}

// ─── Wikipedia Summary ──────────────────────────────────────────────
async function fetchWikipediaSummary(query) {
  try {
    const searchRes = await axios.get("https://en.wikipedia.org/w/api.php", {
      params: {
        action: "query",
        list: "search",
        srsearch: query,
        format: "json",
        srlimit: 1,
      },
    });

    const topResult = searchRes.data.query.search[0];
    if (!topResult) return null;

    const title = topResult.title;

    const summaryRes = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    );

    return {
      title: summaryRes.data.title,
      summary: summaryRes.data.extract,
      url: summaryRes.data.content_urls.desktop.page,
      thumbnail: summaryRes.data.thumbnail?.source || null,
      source: "wikipedia",
    };
  } catch (err) {
    console.error("Wikipedia API error:", err.message);
    return null;
  }
}

module.exports = {
  fetchDuckDuckGoResults,
  getYouTubeSearchLinks,
  fetchWikipediaSummary,
};